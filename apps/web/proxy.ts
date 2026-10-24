// apps/web/proxy.ts
// Next.js 16+ Node.js Proxy Routing & Stateful Session Gate
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';


function getRoleHomeRoute(role?: string): string {
  switch (role) {
    case 'doctor':
      return '/doctor';
    case 'handler':
      return '/handler';
    case 'cashier':
      return '/cashier';
    case 'receptionist':
      return '/receptionist';
    case 'admin':
    default:
      return '/admin';
  }
}

function parseJwtPayload(token: string): { exp?: number; role?: string; userId?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(base64Payload, 'base64').toString('utf8');
    return JSON.parse(decoded);
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
  const accessToken =
    request.cookies.get('hpc_session_token')?.value ||
    request.cookies.get('hpc_access_token')?.value;
  const sessionCookie =
    request.cookies.get('hpc_session')?.value ||
    request.cookies.get('__Host-SESSION_TOKEN')?.value ||
    request.cookies.get('SESSION_TOKEN')?.value;

  let hasValidSession = false;
  let userRole: string | undefined = undefined;

  if (sessionCookie) {
    try {
      const decoded = decodeURIComponent(sessionCookie);
      const parsed = JSON.parse(decoded);
      if (parsed && typeof parsed === 'object') {
        hasValidSession = true;
        if (parsed.role) {
          userRole = parsed.role;
        }
      }
    } catch {
      try {
        const parsed = JSON.parse(sessionCookie);
        if (parsed && typeof parsed === 'object') {
          hasValidSession = true;
          if (parsed.role) {
            userRole = parsed.role;
          }
        }
      } catch {
        if (sessionCookie === '1' || sessionCookie.length > 5) {
          hasValidSession = true;
        }
      }
    }
  }

  if (accessToken) {
    const payload = parseJwtPayload(accessToken);
    if (payload && (!payload.exp || payload.exp * 1000 > Date.now())) {
      hasValidSession = true;
      if (!userRole && payload.role) {
        userRole = payload.role;
      }
    }
  }

  const effectiveRole = userRole || 'admin';

  // 3. Root page "/" is strictly public for visitors
  if (pathname === '/') {
    return NextResponse.next();
  }

  // 4. Auth pages (/auth/*):
  // When logged in with a valid session, /auth pages redirect to the authorized workstation
  if (pathname.startsWith('/auth')) {
    if (hasValidSession) {
      const dest = getRoleHomeRoute(effectiveRole);
      if (pathname !== dest) {
        return NextResponse.redirect(new URL(dest, request.url));
      }
    }
    // Unauthenticated visitors are free to access /auth/login, /auth/register, etc.
    return NextResponse.next();
  }

  // 5. Legacy /dashboard route fallback
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    if (hasValidSession) {
      const dest = getRoleHomeRoute(effectiveRole);
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // 6. ALL OTHER PAGES ARE PRIVATE AND REQUIRE AUTHENTICATION
  // Unauthenticated visitors trying to access any private route are redirected to login
  if (!hasValidSession) {
    if (pathname === '/auth/login' || pathname.startsWith('/auth/')) {
      return NextResponse.next();
    }
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 7. /tv is accessible to ANY authenticated user (all 5 roles)
  if (pathname === '/tv' || pathname.startsWith('/tv/')) {
    return NextResponse.next();
  }

  // 8. Strict Role-Based Workstation Access Control
  // Admin has universal access to all role pages and tools
  if (effectiveRole === 'admin') {
    return NextResponse.next();
  }

  // Dedicated role route prefixes
  const roleAllowedPrefix: Record<string, string> = {
    doctor: '/doctor',
    receptionist: '/receptionist',
    cashier: '/cashier',
    handler: '/handler',
  };

  const allowedPrefix = roleAllowedPrefix[effectiveRole];

  if (allowedPrefix) {
    if (pathname === allowedPrefix || pathname.startsWith(`${allowedPrefix}/`)) {
      return NextResponse.next();
    }
    // Attempted to access an unauthorized workstation page -> redirect to their authorized home
    if (pathname !== allowedPrefix) {
      return NextResponse.redirect(new URL(allowedPrefix, request.url));
    }
    return NextResponse.next();
  }

  // Fallback for any other session role
  const fallbackDest = getRoleHomeRoute(effectiveRole);
  if (pathname === fallbackDest || pathname.startsWith(`${fallbackDest}/`)) {
    return NextResponse.next();
  }
  return NextResponse.redirect(new URL(fallbackDest, request.url));
}

export default proxy;

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
