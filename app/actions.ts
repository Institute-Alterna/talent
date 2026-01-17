'use server';

/**
 * Server Actions for Authentication
 *
 * These actions handle authentication flows and must be defined
 * in a separate file with 'use server' directive.
 */

import { signIn, signOut } from '@/lib/auth';

/**
 * Sign in with Okta
 *
 * Initiates the OAuth flow with Okta.
 * After successful authentication, redirects to the dashboard.
 */
export async function signInWithOkta() {
  await signIn('okta', { redirectTo: '/dashboard' });
}

/**
 * Sign out
 *
 * Signs the user out and redirects to the home page.
 */
export async function signOutAction() {
  await signOut({ redirectTo: '/' });
}
