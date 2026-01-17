/**
 * NextAuth.js API Route Handler
 *
 * This catch-all route handles all authentication-related requests:
 * - GET /api/auth/signin - Sign in page
 * - GET /api/auth/signout - Sign out page
 * - GET /api/auth/callback/okta - OAuth callback
 * - GET /api/auth/session - Get current session
 * - POST /api/auth/signin/okta - Initiate sign in
 * - POST /api/auth/signout - Sign out
 *
 * The handlers are exported from our auth configuration in lib/auth.ts
 */

import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
