// api/auth/callback.js
// Step 2 of Google OAuth: exchange code for tokens, find/create user, issue JWT
import { Pool } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
    const { code, error: oauthError } = req.query;

    if (oauthError) {
        return res.redirect(`/?auth_error=${encodeURIComponent(oauthError)}`);
    }

    if (!code) {
        return res.redirect('/?auth_error=No+authorization+code+received');
    }

    try {
        const appBase = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : 'https://billingsystem1.vercel.app';

        const redirectUri = `${appBase}/api/auth/callback`;

        // Exchange authorization code for Google access token
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            })
        });

        const tokenData = await tokenRes.json();

        if (!tokenRes.ok || tokenData.error) {
            console.error('[Google OAuth] Token exchange failed:', tokenData.error);
            return res.redirect(`/?auth_error=Google+sign-in+failed`);
        }

        // Get user info from Google
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const googleUser = await userInfoRes.json();

        if (!googleUser.email) {
            return res.redirect('/?auth_error=Could+not+get+email+from+Google');
        }

        const email = googleUser.email.toLowerCase().trim();

        // Find or create user in NeonDB
        let user;
        const { rows: existing } = await pool.query(
            `SELECT id, email FROM auth.users WHERE email = $1`, [email]
        );

        if (existing.length > 0) {
            user = existing[0];
        } else {
            // Create new user (Google users get a random long password they never use)
            const randomPwd = randomBytes(32).toString('hex');
            const hashedPassword = await bcrypt.hash(randomPwd, 12);
            const { rows } = await pool.query(
                `INSERT INTO auth.users (email, encrypted_password, created_at)
                 VALUES ($1, $2, NOW()) RETURNING id, email`,
                [email, hashedPassword]
            );
            user = rows[0];
        }

        // Issue our JWT
        const token = jwt.sign(
            { sub: user.id, email: user.email, role: 'authenticated' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Encode session as base64 and pass it to the frontend via URL
        const session = Buffer.from(JSON.stringify({
            access_token: token,
            user: { id: user.id, email: user.email }
        })).toString('base64url');

        // Redirect back to app with the session encoded in URL hash
        return res.redirect(`${appBase}/?google_session=${session}`);

    } catch (err) {
        console.error('[Google OAuth] Callback error:', err.message);
        return res.redirect('/?auth_error=Authentication+failed.+Please+try+again.');
    }
}
