import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];

// Prefixes that require *some* authenticated user.
const protectedRoutes = ['/user', '/post-ad', '/admin', '/agent/leads', '/agent/analytics', '/agent/subscriptions'];

// Prefixes that additionally require a specific role. Checked after the
// generic auth check above. This is a UX-level redirect only — the backend
// independently enforces authorization on every API call regardless of what
// the middleware decides here.
const roleRoutes: { prefix: string; roles: string[] }[] = [
  { prefix: '/admin', roles: ['admin'] },
  { prefix: '/agent/leads', roles: ['agent', 'admin'] },
  { prefix: '/agent/analytics', roles: ['agent', 'admin'] },
  { prefix: '/agent/subscriptions', roles: ['agent', 'admin'] },
];

/**
 * Reads the `role` claim out of a JWT's payload without verifying its
 * signature. Good enough to decide whether to show a UI redirect; never
 * trust this for actual authorization.
 */
function readRoleFromToken(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(
      Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
    );
    return typeof decoded?.role === 'string' ? decoded.role : null;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));
  if (isPublicRoute) return NextResponse.next();

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  if (!isProtectedRoute) return NextResponse.next();

  if (!token) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  const matchedRoleRoute = roleRoutes.find((route) => pathname.startsWith(route.prefix));
  if (matchedRoleRoute) {
    const role = readRoleFromToken(token);
    if (!role || !matchedRoleRoute.roles.includes(role)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
