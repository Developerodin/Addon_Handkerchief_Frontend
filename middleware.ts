import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAccessTokenExpired } from '@/shared/utils/authToken';

const protectedPrefixes = [
  '/dashboards',
  '/catalog',
  '/production',
  '/warehouse',
  '/whm',
  '/quality',
  '/store',
  '/checkpoints',
  '/sync',
  '/settings',
];

const publicPrefixes = ['/auth/login', '/auth/forgot-password'];

function clearAccessTokenCookie(response: NextResponse): void {
  response.cookies.set('accessToken', '', {
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
  });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('accessToken')?.value;
  const tokenExpired = token ? isAccessTokenExpired(token) : true;
  const hasValidToken = Boolean(token) && !tokenExpired;

  const isProtectedPath = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  const isPublicPath = publicPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (pathname === '/' || pathname === '') {
    if (hasValidToken) {
      return NextResponse.redirect(new URL('/dashboards/main/', request.url));
    }
    const response = NextResponse.redirect(new URL('/auth/login/', request.url));
    if (token && tokenExpired) {
      clearAccessTokenCookie(response);
    }
    return response;
  }

  if (isProtectedPath && !hasValidToken) {
    const response = NextResponse.redirect(new URL('/auth/login/', request.url));
    if (token && tokenExpired) {
      clearAccessTokenCookie(response);
    }
    return response;
  }

  if (isPublicPath && hasValidToken) {
    return NextResponse.redirect(new URL('/dashboards/main/', request.url));
  }

  if (isPublicPath && token && tokenExpired) {
    const response = NextResponse.next();
    clearAccessTokenCookie(response);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|assets).*)'],
};