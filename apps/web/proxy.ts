// apps/web/proxy.ts
// Next.js 16+ Edge Proxy & Middleware Authentication Gate
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function getRoleHomeRoute(role?: string): string {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'head_doctor':
    case 'doctor':
      return '/doctor';
    case 'reception':
    case 'receptionist':
      return '/receptionist';
    case 'cashier':
      return '/cashier';
    case 'therapist':
      return '/therapy';
    case 'pharmacy':
      return '/pharmacy';
    default:
      return '/receptionist';
  }
}

function parseJwtPayload(token: string): { exp?: number; role?: string; userId?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Static assets, API routes, and PWA system files are completely bypassed
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/fonts') ||
    pathname.startsWith('/hpclogo') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/android-chrome') ||
    pathname.startsWith('/apple-touch-icon') ||
    pathname.startsWith('/manifest') ||
    pathname.startsWith('/sw.js') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.webmanifest')
  ) {
    return NextResponse.next();
  }

  // 2. Validate server-managed stateful session from cookies
  const accessToken = request.cookies.get('hpc_access_token')?.value;
  const sessionCookie =
    request.cookies.get('hpc_session')?.value ||
    request.cookies.get('__Host-SESSION_TOKEN')?.value ||
    request.cookies.get('SESSION_TOKEN')?.value;

  let hasValidSession = false;
  let userRole: string | undefined = undefined;

  if (accessToken) {
    const payload = parseJwtPayload(accessToken);
    if (payload && (!payload.exp || payload.exp * 1000 > Date.now())) {
      hasValidSession = true;
      userRole = payload.role;
    }
  }

  if (!hasValidSession && sessionCookie) {
    try {
      const parsed = JSON.parse(sessionCookie);
      if (parsed && typeof parsed === 'object') {
        hasValidSession = true;
        userRole = parsed.role;
      }
    } catch {
      // If sessionCookie is a simple truthy flag e.g. "1"
      if (sessionCookie === '1' || sessionCookie.length > 5) {
        hasValidSession = true;
      }
    }
  }

  // 3. Root page "/" is strictly public for visitors
  if (pathname === '/') {
    return NextResponse.next();
  }

  // 4. Auth pages (/auth/*):
  // When logged in with a valid session, /auth pages CANNOT be visited -> redirect to workstation
  if (pathname.startsWith('/auth')) {
    if (hasValidSession) {
      const dest = getRoleHomeRoute(userRole);
      return NextResponse.redirect(new URL(dest, request.url));
    }
    // Unauthenticated visitors are free to access /auth/login, /auth/register, etc.
    return NextResponse.next();
  }

  // 5. Legacy /dashboard route fallback
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    if (hasValidSession) {
      const dest = getRoleHomeRoute(userRole);
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // 6. ALL OTHER PAGES ARE PRIVATE AND REQUIRE AUTHENTICATION
  // (/tv, /admin, /cashier, /doctor, /reception, /receptionist, /billing, /therapy, /pharmacy, etc.)
  if (!hasValidSession) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Export both proxy and middleware for universal Next.js 16+ compatibility
export const middleware = proxy;
export default proxy;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
