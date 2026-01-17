/**
 * Authentication Configuration (Edge-Compatible)
 *
 * This module contains the NextAuth configuration that can run in Edge Runtime.
 * It does NOT include any database operations or Node.js-specific modules.
 *
 * Used by:
 * - middleware.ts (for route protection)
 *
 * The full auth configuration with database sync is in auth.ts
 */

import type { NextAuthConfig } from 'next-auth';
import Okta from 'next-auth/providers/okta';

// Debug: Log Okta config on startup (remove in production)
if (process.env.NODE_ENV === 'development') {
  console.log('[Auth Config] OKTA_CLIENT_ID set:', !!process.env.OKTA_CLIENT_ID);
  console.log('[Auth Config] OKTA_CLIENT_SECRET set:', !!process.env.OKTA_CLIENT_SECRET);
  console.log('[Auth Config] OKTA_ISSUER:', process.env.OKTA_ISSUER);
}

/**
 * Edge-compatible NextAuth configuration
 *
 * This config only includes the provider setup and basic callbacks.
 * Database operations happen in auth.ts callbacks, not here.
 */
export const authConfig: NextAuthConfig = {
  providers: [
    Okta({
      clientId: process.env.OKTA_CLIENT_ID!,
      clientSecret: process.env.OKTA_CLIENT_SECRET!,
      issuer: process.env.OKTA_ISSUER!,
      authorization: {
        params: {
          scope: 'openid profile email groups',
        },
      },
    }),
  ],

  pages: {
    signIn: '/',
    error: '/auth/error',
  },

  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },

  callbacks: {
    /**
     * Authorized callback - runs in Edge Runtime for middleware
     *
     * This only checks if the user is authenticated.
     * Admin checks are done in the JWT callback in auth.ts
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;

      // Define protected route patterns
      const isProtectedRoute =
        nextUrl.pathname.startsWith('/dashboard') ||
        nextUrl.pathname.startsWith('/candidates') ||
        nextUrl.pathname.startsWith('/settings') ||
        nextUrl.pathname.startsWith('/users');

      if (isProtectedRoute && !isLoggedIn) {
        return false; // Will redirect to signIn page
      }

      return true;
    },
  },
};
