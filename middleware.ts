import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);

  // Rewrite Origin/Host headers for auth API routes so that
  // better-auth (inside @neondatabase/auth) sees the origin it expects.
  // Without this, requests from Vercel aliases like billingsystem1.vercel.app
  // get rejected with "Invalid origin" because NEON_AUTH_BASE_URL points to
  // the primary deployment URL.
  if (request.nextUrl.pathname.startsWith('/api/auth/')) {
    const neonBaseUrl = process.env.NEON_AUTH_BASE_URL;
    if (neonBaseUrl) {
      try {
        const expected = new URL(neonBaseUrl);
        requestHeaders.set('origin', expected.origin);
        requestHeaders.set('host', expected.host);
        requestHeaders.set('x-forwarded-host', expected.host);
      } catch {
        // If the URL is malformed, just let it pass through unchanged
      }
    }

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // For all other matched routes: check for session cookie
  const token = request.cookies.get('__Secure-neon-auth.session_token') || 
                request.cookies.get('neon-auth.session_token');
  
  if (!token) {
    const signInUrl = new URL('/sign-in', request.url);
    return NextResponse.redirect(signInUrl);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match everything EXCEPT static files, sign-in/up pages, etc.
    // NOTE: api/auth is intentionally NOT excluded so the middleware can
    // rewrite its headers before the request reaches the auth handler.
    '/((?!_next|sign-in|sign-up|forgot-password|reset-password|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
};
