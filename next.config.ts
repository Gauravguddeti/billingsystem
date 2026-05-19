import type { NextConfig } from "next";

const securityHeaders = [
  // Block clickjacking attacks
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Control referrer information
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disable unused browser features
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Force HTTPS for 1 year (only meaningful in prod)
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  // Content Security Policy — allow same-origin + Google Fonts
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js needs unsafe-eval in dev
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self' https://*.neon.tech wss://*.neon.tech",
      "frame-ancestors 'self'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  // Compress responses
  compress: true,

  // Security headers on all routes
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      // Cache static API data: products and categories change rarely
      {
        source: '/api/products',
        headers: [{ key: 'Cache-Control', value: 'private, max-age=30, stale-while-revalidate=60' }],
      },
      {
        source: '/api/categories',
        headers: [{ key: 'Cache-Control', value: 'private, max-age=60, stale-while-revalidate=120' }],
      },
      {
        source: '/api/settings',
        headers: [{ key: 'Cache-Control', value: 'private, max-age=60, stale-while-revalidate=120' }],
      },
    ];
  },

  // Silence Turbopack vs Webpack warning on Vercel
  turbopack: {},
};

export default nextConfig;
