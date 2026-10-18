// apps/web/proxy.ts
// Next.js 16+ Edge Proxy Authentication Gate
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Root page "/" is strictly public
  if (pathname === '/') {
    return NextResponse.next();
  }

  // 2. Auth flow pages are public
  if (pathname.startsWith('/auth')) {
    return NextResponse.next();
  }

  // 3. Static assets, API routes, and PWA system files
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

  // 4. Legacy /dashboard route: permanently redirect to workstation or login
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    const sessionCookie =
      request.cookies.get('hpc_session')?.value ||
      request.cookies.get('__Host-SESSION_TOKEN')?.value ||
      request.cookies.get('SESSION_TOKEN')?.value;
    if (sessionCookie) {
      return NextResponse.redirect(new URL('/receptionist', request.url));
    }
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // 5. ALL OTHER PAGES REQUIRE AUTHENTICATION
  // (/tv, /receptionist, /reception, /doctor, /cashier, /billing, /therapy, /pharmacy, /admin)
  const sessionCookie =
    request.cookies.get('hpc_session')?.value ||
    request.cookies.get('__Host-SESSION_TOKEN')?.value ||
    request.cookies.get('SESSION_TOKEN')?.value;

  if (!sessionCookie) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
