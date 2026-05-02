import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check for the Neon Auth session cookie
  const token = request.cookies.get('__Secure-neon-auth.session_token') || 
                request.cookies.get('neon-auth.session_token');
  
  if (!token) {
    const signInUrl = new URL('/sign-in', request.url);
    // Add the original URL as a redirect parameter if needed, or just redirect
    return NextResponse.redirect(signInUrl);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|sign-in|sign-up|forgot-password|reset-password|api/auth|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
};
