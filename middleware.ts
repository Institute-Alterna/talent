/**
 * Next.js Middleware
 *
 * This middleware runs on every request in Edge Runtime and handles:
 * - Route protection (redirecting unauthenticated users)
 *
 * Uses the edge-compatible auth config (no database operations).
 * Admin-only route protection is handled in the page components
 * since we need the full JWT with isAdmin flag from the database sync.
 *
 * Protected routes:
 * - /dashboard/* - Requires authentication
 * - /candidates/* - Requires authentication
 * - /settings/* - Requires authentication
 * - /users/* - Requires authentication (admin check done in page)
 */

import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

const { auth } = NextAuth(authConfig);

export default auth;

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    // Match protected routes only
    '/dashboard/:path*',
    '/candidates/:path*',
    '/settings/:path*',
    '/users/:path*',
  ],
};
