# Supabase Setup Guide

## Step 1: Get Your API Keys

1. Go to your Supabase project: https://yylahhomjnijsybazxpt.supabase.co
2. Click on the **Settings** icon (gear) in the left sidebar
3. Go to **API** section
4. You'll need two keys:
   - **Project URL**: `https://yylahhomjnijsybazxpt.supabase.co` ✅ (you have this)
   - **anon/public key**: Copy the long key under "Project API keys" → "anon public"

## Step 2: Run Database Schema

1. In your Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Copy the ENTIRE contents of `supabase-schema.sql` file
4. Paste it into the SQL editor
5. Click **Run** (or press Ctrl+Enter)
6. You should see "Success. No rows returned"

## Step 3: Enable Email Authentication

1. Go to **Authentication** → **Providers** in the left sidebar
2. Make sure **Email** is enabled (it should be by default)
3. Configure email templates (optional):
   - Go to **Authentication** → **Email Templates**
   - Customize confirmation and reset password emails

## Step 4: Enable Google Authentication (Optional)

1. Go to **Authentication** → **Providers**
2. Click on **Google**
3. Toggle "Enable Sign in with Google"
4. You need to create Google OAuth credentials:

### Creating Google OAuth Credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Configure consent screen if prompted:
   - User Type: External
   - App name: Smart GST Billing
   - User support email: your email
   - Developer contact: your email
6. Create OAuth client ID:
   - Application type: **Web application**
   - Name: Billing System
   - Authorized redirect URIs: `https://yylahhomjnijsybazxpt.supabase.co/auth/v1/callback`
7. Copy the **Client ID** and **Client Secret**
8. Paste them in Supabase Google provider settings
9. Click **Save**

## Step 5: Configure Your Application

The `index.html` file is already configured with your credentials:
- Project URL: `https://yylahhomjnijsybazxpt.supabase.co`
- You just need to add the **anon key** from Step 1

## Step 6: Test the Application

1. Open `index.html` in your browser (or deploy to Vercel)
2. You should see a login page
3. Click "Sign Up" to create an account
4. Verify your email (check spam folder)
5. Log in and start using the system

## Troubleshooting

**"Invalid API key" error**
- Make sure you copied the correct anon/public key from Settings → API
- Check for extra spaces or missing characters

**Email not received**
- Check spam folder
- Verify email provider is enabled in Authentication → Providers
- Check email rate limits in Supabase (free tier has limits)

**Google sign-in not working**
- Verify redirect URI is exactly: `https://yylahhomjnijsybazxpt.supabase.co/auth/v1/callback`
- Make sure Google provider is enabled in Supabase
- Check OAuth consent screen is configured

**Data not showing after login**
- Open browser console (F12) and check for errors
- Verify database schema was run successfully
- Check Row Level Security policies are enabled

## Security Notes

- The **anon key** is safe to use in frontend code
- Never share your **service_role key** (keep it secret)
- Row Level Security ensures users can only access their own data
- All passwords are hashed by Supabase (you never see them)

## Next Steps

After setup:
1. Log in with your account
2. Go to Settings and configure your business details
3. Add products in Products tab
4. Start creating invoices!

---

Your data is now:
- ✅ Backed up in the cloud
- ✅ Accessible from any device
- ✅ Secure with authentication
- ✅ Isolated per user (multi-tenant)
