import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in the environment variables');
}

const dbUrl = process.env.DATABASE_URL || '';
export const sql = dbUrl.startsWith('postgres') ? neon(dbUrl) : ((() => { throw new Error('Invalid DATABASE_URL'); }) as any);

// ─── User session cache ────────────────────────────────────────────────────────
// Avoids 1–2 DB round-trips on every API request.
// TTL of 5 minutes balances freshness vs. performance.
// In serverless environments (Vercel), this persists for the lifetime of the
// function instance (typically minutes), giving meaningful cache hits.
const USER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const userCache = new Map<string, { user: any; expiresAt: number }>();

function getCachedUser(neonUserId: string) {
  const entry = userCache.get(neonUserId);
  if (entry && entry.expiresAt > Date.now()) return entry.user;
  userCache.delete(neonUserId);
  return null;
}

function setCachedUser(neonUserId: string, user: any) {
  // Evict old entries if cache grows too large (safety net)
  if (userCache.size > 500) userCache.clear();
  userCache.set(neonUserId, { user, expiresAt: Date.now() + USER_CACHE_TTL_MS });
}

/**
 * Ensures a user exists in our DB, mapping their Neon Auth ID.
 * Uses a per-process in-memory cache to avoid DB hits on every API call.
 */
export async function getOrCreateUser(neonUserId: string, email: string, name?: string) {
  // Fast path: return from cache without any DB call
  const cached = getCachedUser(neonUserId);
  if (cached) return cached;

  // 1. Try find by neon_auth_id
  let rows = await sql`SELECT * FROM user_profiles WHERE neon_auth_id = ${neonUserId}`;
  if (rows.length > 0) {
    setCachedUser(neonUserId, rows[0]);
    return rows[0];
  }

  // 2. Try find by email (existing user migrated before neon_auth_id was tracked)
  rows = await sql`SELECT * FROM user_profiles WHERE email = ${email}`;
  if (rows.length > 0) {
    // Link Neon ID to existing account — preserves all their data
    await sql`UPDATE user_profiles SET neon_auth_id = ${neonUserId} WHERE email = ${email}`;
    setCachedUser(neonUserId, rows[0]);
    return rows[0];
  }

  // 3. Brand new user — use the Neon Auth user UUID directly as the profile ID
  try {
    const newRows = await sql`
      INSERT INTO user_profiles (id, email, neon_auth_id, created_at)
      VALUES (${neonUserId}::uuid, ${email}, ${neonUserId}, NOW())
      ON CONFLICT (id) DO UPDATE SET neon_auth_id = EXCLUDED.neon_auth_id
      RETURNING *
    `;
    setCachedUser(neonUserId, newRows[0]);
    return newRows[0];
  } catch (insertErr: any) {
    // Fallback: generate a fresh UUID if the Neon user ID can't be used as PK
    const newRows = await sql`
      INSERT INTO user_profiles (id, email, neon_auth_id, created_at)
      VALUES (gen_random_uuid(), ${email}, ${neonUserId}, NOW())
      ON CONFLICT (neon_auth_id) DO UPDATE SET email = EXCLUDED.email
      RETURNING *
    `;
    setCachedUser(neonUserId, newRows[0]);
    return newRows[0];
  }
}

/**
 * Invalidate a user's cache entry (call after profile updates).
 */
export function invalidateUserCache(neonUserId: string) {
  userCache.delete(neonUserId);
}
