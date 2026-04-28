// api/auth/google.js
// Step 1 of Google OAuth: redirect user to Google's consent page
export default function handler(req, res) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
        return res.status(500).json({ error: 'Google OAuth not configured' });
    }

    const redirectUri = `${process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'https://billingsystem1.vercel.app'}/api/auth/callback`;

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'online',
        prompt: 'select_account'
    });

    return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
