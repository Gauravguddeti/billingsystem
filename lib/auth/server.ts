import { createNeonAuth } from '@neondatabase/auth/next/server';

// Force trusted origins so better-auth doesn't reject production Vercel aliases
process.env.BETTER_AUTH_URL = 'https://billingsystem1.vercel.app';
process.env.BETTER_AUTH_TRUSTED_ORIGINS = [
  'https://billingsystem1.vercel.app',
  'https://billingsystem-yourchads-projects.vercel.app',
  'http://localhost:3000',
  process.env.NEXT_PUBLIC_APP_URL || ''
].filter(Boolean).join(',');

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  trustedOrigins: [
    'https://billingsystem1.vercel.app',
    'https://billingsystem-yourchads-projects.vercel.app',
    'http://localhost:3000',
    process.env.NEXT_PUBLIC_APP_URL || ''
  ].filter(Boolean),
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
} as any);
