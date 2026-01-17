/**
 * Okta IdP-Initiated Login Handler
 *
 * This endpoint handles logins initiated from the Okta dashboard (IdP-initiated SSO).
 * When users click the app tile in their Okta portal, Okta redirects them here.
 *
 * Configure this URL in Okta as the "Initiate Login URI":
 * - Development: http://localhost:3000/api/auth/okta/initiate-login
 * - Production: https://your-domain.com/api/auth/okta/initiate-login
 *
 * Flow:
 * 1. User clicks app tile in Okta
 * 2. Okta redirects to this endpoint
 * 3. This endpoint initiates the OAuth flow back to Okta
 * 4. After successful auth, user lands on /dashboard
 *
 * This endpoint supports the OIDC login flow which is recommended for
 * Next.js/Auth.js applications.
 */

import { redirect } from 'next/navigation';
import { signIn, auth } from '@/lib/auth';

export async function GET(request: Request) {
  // Check if user is already authenticated
  const session = await auth();

  if (session?.user) {
    // User is already logged in, redirect to dashboard
    redirect('/dashboard');
  }

  // Parse query parameters that Okta might send
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get('target_link_uri');

  // Determine where to redirect after successful login
  // If Okta provided a target_link_uri, use that; otherwise, default to /dashboard
  const redirectTo = targetUrl && targetUrl.startsWith('/') ? targetUrl : '/dashboard';

  // Initiate the Okta OAuth flow
  // This will redirect the user to Okta's authorization endpoint
  await signIn('okta', { redirectTo });
}

export async function POST(request: Request) {
  // Some IdP implementations might POST to this endpoint
  // Handle it the same way as GET
  return GET(request);
}
