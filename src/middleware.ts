import { NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';

/**
 * Route protection (Module 11). Uses the NextAuth JWT (HTTP-only cookie):
 *  - /admin/**          requires role ADMIN
 *  - /account, /checkout require any authenticated user
 * Unauthenticated users are redirected to /login with a callbackUrl.
 */
export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth;
    const { pathname } = req.nextUrl;

    if (pathname.startsWith('/admin') && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login?callbackUrl=/admin/dashboard', req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      // Returning true → authorized. We gate purely on token presence here and
      // do the role check above so we can redirect non-admins cleanly.
      authorized: ({ token }) => Boolean(token),
    },
    pages: { signIn: '/login' },
  },
);

export const config = {
  matcher: ['/admin/:path*', '/account/:path*', '/checkout/:path*'],
};
