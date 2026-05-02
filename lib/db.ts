import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in the environment variables');
}

const dbUrl = process.env.DATABASE_URL || '';
export const sql = dbUrl.startsWith('postgres') ? neon(dbUrl) : ((() => { throw new Error('Invalid DATABASE_URL'); }) as any);

/**
 * Ensures a user exists in our DB, mapping their Neon ID to their email.
 * This bridges the gap between Neon Auth and our neonDB data.
 */
export async function getOrCreateUser(neonUserId: string, email: string, name?: string) {
  // 1. Try find by neon_auth_id
  let rows = await sql`SELECT * FROM user_profiles WHERE neon_auth_id = ${neonUserId}`;
  if (rows.length > 0) return rows[0];
  
  // 2. Try find by email (existing user before migration)
  rows = await sql`SELECT * FROM user_profiles WHERE email = ${email}`;
  if (rows.length > 0) {
    // Link Neon ID to existing account — preserves all their data
    await sql`UPDATE user_profiles SET neon_auth_id = ${neonUserId} WHERE email = ${email}`;
    return rows[0];
  }
  
  // 3. Brand new user
  // Since user_profiles.id originally referenced auth.users which we no longer use,
  // we must generate a random UUID for new users to satisfy the foreign keys of other tables.
  const newRows = await sql`
    INSERT INTO user_profiles (id, email, neon_auth_id, created_at)
    VALUES (gen_random_uuid(), ${email}, ${neonUserId}, NOW())
    RETURNING *
  `;
  return newRows[0];
}
