import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const sql = neon(process.env.DATABASE_URL!);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Find user in old auth.users table (from Supabase/custom legacy auth)
    const users = await sql`SELECT * FROM auth.users WHERE email = ${email} LIMIT 1`;
    if (users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    const oldUser = users[0];

    // Verify password against old hash (Supabase uses bcrypt/crypt)
    if (!oldUser.encrypted_password) {
      return Response.json({ error: 'No password set for this account' }, { status: 401 });
    }
    
    const valid = await bcrypt.compare(password, oldUser.encrypted_password);
    if (!valid) {
      return Response.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Try to create user in Neon Auth — if already exists, that's fine, just proceed
    let neonUserId: string | null = null;
    
    const signUpRes = await fetch(
      `${process.env.NEON_AUTH_BASE_URL}/sign-up/email`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Origin': appUrl,
        },
        body: JSON.stringify({
          email: oldUser.email,
          password: password,
          name: oldUser.name || oldUser.email.split('@')[0],
        }),
      }
    );

    if (signUpRes.ok) {
      const data = await signUpRes.json();
      neonUserId = data.user?.id ?? null;
      console.log('[migrate-user] Created in Neon Auth:', neonUserId);
    } else {
      const errBody = await signUpRes.json().catch(() => ({}));
      // User already exists in Neon Auth — that's OK, we just need to update the link
      if (errBody.code === 'USER_ALREADY_EXISTS' || signUpRes.status === 422 || signUpRes.status === 409) {
        console.log('[migrate-user] User already exists in Neon Auth, will link after sign-in');
        // Signal to the client to attempt sign-in directly
        return Response.json({ success: true, alreadyExists: true });
      }
      console.error('[migrate-user] Neon Auth sign-up error:', errBody);
      return Response.json({ error: errBody.message || 'Migration failed' }, { status: 500 });
    }

    // If we got a neonUserId, link it to the existing user_profiles row (by old auth.users.id)
    if (neonUserId) {
      await sql`
        UPDATE user_profiles 
        SET neon_auth_id = ${neonUserId} 
        WHERE id = ${oldUser.id}
      `;
      console.log('[migrate-user] Linked neon_auth_id to user_profiles row:', oldUser.id);
    }

    return Response.json({ success: true, message: 'User migrated' });
  } catch (error) {
    console.error('[migrate-user] Error:', error);
    return Response.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
