import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ─── Simple in-memory rate limiter ────────────────────────────────────────────
// Limits: 120 API requests per minute per IP.
// Note: resets on cold-start in serverless, but provides meaningful protection
// against burst abuse within a single function instance lifetime.
const RATE_LIMIT = 120;       // max requests
const RATE_WINDOW_MS = 60_000; // per minute

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || entry.resetAt < now) {
    // New window
    if (rateLimitMap.size > 10_000) rateLimitMap.clear(); // safety eviction
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false; // over limit

  entry.count++;
  return true;
}

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const { pathname } = request.nextUrl;

  // ── Auth routes: rewrite origin headers for Neon Auth ──────────────────────
  if (pathname.startsWith('/api/auth/')) {
    const neonBaseUrl = process.env.NEON_AUTH_BASE_URL;
    if (neonBaseUrl) {
      try {
        const expected = new URL(neonBaseUrl);
        requestHeaders.set('origin', expected.origin);
        requestHeaders.set('host', expected.host);
        requestHeaders.set('x-forwarded-host', expected.host);
      } catch {
        // malformed URL — pass through unchanged
      }
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // ── Rate limiting on all API routes ────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    if (!checkRateLimit(ip)) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please slow down.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
            'X-RateLimit-Limit': String(RATE_LIMIT),
          },
        }
      );
    }
  }

  // ── Session guard for all matched page routes ───────────────────────────────
  const token =
    request.cookies.get('__Secure-neon-auth.session_token') ||
    request.cookies.get('neon-auth.session_token');

  if (!token) {
    const signInUrl = new URL('/sign-in', request.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|sign-in|sign-up|forgot-password|reset-password|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
};
