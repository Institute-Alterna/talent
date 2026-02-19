/**
 * Authentication Configuration
 *
 * This module configures NextAuth.js v5 (Auth.js) with Okta as the OAuth provider.
 * It handles:
 * - OAuth flow with Okta
 * - Session management with JWT
 * - User sync to local database on login
 * - Admin detection via Okta group membership
 *
 * Environment variables required:
 * - OKTA_DOMAIN: Your Okta domain (e.g., alterna.okta.com)
 * - OKTA_CLIENT_ID: OAuth client ID from Okta
 * - OKTA_CLIENT_SECRET: OAuth client secret from Okta
 * - OKTA_ISSUER: Okta issuer URL (e.g., https://alterna.okta.com/oauth2/default)
 * - ADMIN_OKTA_GROUP_ID: Okta group ID for administrators
 * - NEXTAUTH_SECRET: Random secret for signing cookies
 */

import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { db } from './db';
import type { User as DbUser } from './generated/prisma/client';
import { branding } from '@/config';

/**
 * Extended session user type with our custom fields
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      firstName?: string;
      displayName?: string;
      title?: string;
      image?: string;
      isAdmin: boolean;
      hasAccess: boolean;
      dbUserId?: string;
    };
  }

  interface User {
    isAdmin?: boolean;
    hasAccess?: boolean;
    dbUserId?: string;
    firstName?: string;
    displayName?: string;
    title?: string;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    isAdmin?: boolean;
    hasAccess?: boolean;
    dbUserId?: string;
    oktaUserId?: string;
    firstName?: string;
    displayName?: string;
    title?: string;
  }
}

/**
 * Check if a user has access to the Talent app and their role
 *
 * Access Control Groups:
 * - talent-access (OKTA_USER_GROUP_ID): Hiring Managers - can view candidates
 * - talent-administration (ADMIN_OKTA_GROUP_ID): Administrators - full access
 *
 * Users must be in at least one of these groups to access the app.
 *
 * @param accessToken - The OAuth access token from Okta
 * @param oktaUserId - The Okta user ID (sub claim)
 * @returns Object with hasAccess and isAdmin flags
 */
async function checkAppAccess(accessToken: string, oktaUserId?: string): Promise<{
  hasAccess: boolean;
  isAdmin: boolean;
}> {
  const adminGroupId = process.env.ADMIN_OKTA_GROUP_ID;
  const userGroupId = process.env.OKTA_USER_GROUP_ID;
  const oktaDomain = process.env.OKTA_DOMAIN;

  if (!adminGroupId && !userGroupId) {
    console.warn('[Auth] No access groups configured - denying access');
    return { hasAccess: false, isAdmin: false };
  }

  // Method 1: Try OAuth userinfo endpoint (if groups claim is configured)
  try {
    const response = await fetch(`https://${oktaDomain}/oauth2/v1/userinfo`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      const userInfo = await response.json();
      const groups: string[] = userInfo.groups || [];
      console.log('[Auth] Userinfo groups:', groups.length > 0 ? groups : 'none (will use API fallback)');

      if (groups.length > 0) {
        const isAdmin = adminGroupId ? groups.includes(adminGroupId) : false;
        const isUser = userGroupId ? groups.includes(userGroupId) : false;
        const hasAccess = isAdmin || isUser;
        console.log('[Auth] Access check via userinfo: hasAccess=', hasAccess, 'isAdmin=', isAdmin);
        return { hasAccess, isAdmin };
      }
      // Groups not in userinfo, fall through to API method
    }
  } catch (error) {
    console.warn('[Auth] OAuth userinfo check failed, trying API method:', error);
  }

  // Method 2: Use Okta Admin API to check group membership
  if (oktaUserId) {
    try {
      // Dynamic import to avoid edge runtime issues
      const { checkUserAppAccess } = await import('@/lib/integrations/okta');
      const result = await checkUserAppAccess(oktaUserId);
      console.log('[Auth] Access check via API: hasAccess=', result.hasAccess, 'isAdmin=', result.isAdmin, 'oktaUserId=', oktaUserId);
      return result;
    } catch (error) {
      console.error('[Auth] Error checking app access via API:', error);
    }
  } else {
    console.warn('[Auth] No oktaUserId provided, cannot check app access via API');
  }

  return { hasAccess: false, isAdmin: false };
}

/**
 * Sync user data from Okta to local database
 *
 * Creates a new user record if one doesn't exist, or updates the existing one.
 * If the OIDC profile doesn't include name claims (given_name, family_name),
 * it fetches the full profile from the Okta Admin API.
 *
 * @param oktaProfile - The user profile from Okta OIDC
 * @param isAdmin - Whether the user is an administrator
 * @returns The database user record
 */
async function syncUserToDatabase(
  oktaProfile: {
    sub: string;
    email: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    preferred_username?: string;
    locale?: string;
    zoneinfo?: string;
  },
  isAdmin: boolean
): Promise<DbUser> {
  const oktaUserId = oktaProfile.sub;
  const email = oktaProfile.email;

  // Start with OIDC claims if available
  let firstName = oktaProfile.given_name || oktaProfile.name?.split(' ')[0] || '';
  let lastName = oktaProfile.family_name || oktaProfile.name?.split(' ').slice(1).join(' ') || '';
  let displayName = oktaProfile.name || oktaProfile.preferred_username || email;
  let middleName: string | undefined;
  let title: string | undefined;
  let city: string | undefined;
  let state: string | undefined;
  let countryCode: string | undefined;
  let preferredLanguage = oktaProfile.locale || 'en';
  let timezone = oktaProfile.zoneinfo || 'America/New_York';

  // If OIDC claims don't have name info, fetch full profile from Okta Admin API
  if (!firstName || firstName === 'Unknown') {
    try {
      console.log('[Auth] OIDC profile missing name claims, fetching from Okta Admin API');
      const { getOktaUser } = await import('@/lib/integrations/okta');
      const fullProfile = await getOktaUser(oktaUserId);

      firstName = fullProfile.profile.firstName || 'Unknown';
      lastName = fullProfile.profile.lastName || '';
      middleName = fullProfile.profile.middleName;
      displayName = fullProfile.profile.displayName || `${firstName} ${lastName}`.trim() || email;
      title = fullProfile.profile.title;
      city = fullProfile.profile.city;
      state = fullProfile.profile.state;
      countryCode = fullProfile.profile.countryCode;
      preferredLanguage = fullProfile.profile.preferredLanguage || preferredLanguage;
      timezone = fullProfile.profile.timezone || timezone;

      console.log('[Auth] Fetched full profile from Okta API:', { firstName, lastName, displayName });
    } catch (error) {
      console.error('[Auth] Failed to fetch full profile from Okta API:', error);
      // Keep firstName as 'Unknown' if API call fails
      firstName = 'Unknown';
    }
  }

  try {
    // Try to find existing user
    const existingUser = await db.user.findUnique({
      where: { oktaUserId },
    });

    if (existingUser) {
      // Update existing user with all profile fields
      const updatedUser = await db.user.update({
        where: { oktaUserId },
        data: {
          email,
          firstName,
          middleName: middleName ?? existingUser.middleName,
          lastName,
          displayName,
          title: title ?? existingUser.title,
          city: city ?? existingUser.city,
          state: state ?? existingUser.state,
          countryCode: countryCode ?? existingUser.countryCode,
          preferredLanguage,
          timezone,
          isAdmin,
          hasAppAccess: true, // User has access if we're syncing them
          lastSyncedAt: new Date(),
        },
      });
      return updatedUser;
    } else {
      // Create new user with all profile fields
      const newUser = await db.user.create({
        data: {
          oktaUserId,
          email,
          firstName,
          middleName,
          lastName,
          displayName,
          title,
          city,
          state,
          countryCode,
          preferredLanguage,
          timezone,
          organisation: branding.organisationName,
          isAdmin,
          hasAppAccess: true, // User has access if we're syncing them
          lastSyncedAt: new Date(),
        },
      });
      return newUser;
    }
  } catch (error) {
    console.error('Error syncing user to database:', error);
    throw error;
  }
}

/**
 * NextAuth configuration with database callbacks
 *
 * Extends the edge-compatible authConfig with Node.js-only features
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,

  callbacks: {

    /**
     * JWT callback - runs when JWT is created or updated
     *
     * On initial sign-in, we:
     * 1. Check admin status via Okta groups
     * 2. Sync user to our database
     * 3. Store relevant info in the JWT
     */
    async jwt({ token, account, profile }) {
      // On initial sign-in
      if (account && profile) {
        console.log('[Auth JWT] Initial sign-in detected for:', (profile as { email?: string }).email);

        const oktaProfile = profile as {
          sub: string;
          email: string;
          name?: string;
          given_name?: string;
          family_name?: string;
          preferred_username?: string;
          locale?: string;
          zoneinfo?: string;
        };

        console.log('[Auth JWT] Okta user ID (sub):', oktaProfile.sub);

        // Check app access and admin status
        const { hasAccess, isAdmin } = account.access_token
          ? await checkAppAccess(account.access_token, oktaProfile.sub)
          : { hasAccess: false, isAdmin: false };

        console.log('[Auth JWT] Access check: hasAccess=', hasAccess, 'isAdmin=', isAdmin);

        // If user doesn't have app access, don't sync to database
        if (!hasAccess) {
          console.warn('[Auth JWT] User does not have app access, denying login');
          token.hasAccess = false;
          token.isAdmin = false;
          return token;
        }

        // Store access info in token (before DB sync, in case it fails)
        token.hasAccess = true;
        token.isAdmin = isAdmin;
        token.oktaUserId = oktaProfile.sub;

        // Sync user to database (non-blocking for access)
        try {
          const dbUser = await syncUserToDatabase(oktaProfile, isAdmin);
          token.dbUserId = dbUser.id;
          token.isAdmin = dbUser.isAdmin;
          token.firstName = dbUser.firstName;
          token.displayName = dbUser.displayName;
          console.log('[Auth JWT] User synced to DB, dbUserId:', dbUser.id, 'isAdmin:', dbUser.isAdmin);
        } catch (error) {
          // DB sync failed, but user still has access (Okta check passed)
          // They just won't have a local DB record until next successful login
          console.error('[Auth JWT] Failed to sync user (user can still access app):', error);
        }
      }

      return token;
    },

    /**
     * Session callback - runs when session is checked
     *
     * Adds our custom fields to the session object.
     * Fetches the latest isAdmin status from the database to ensure
     * admin/access changes take effect immediately without re-login.
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.dbUserId = token.dbUserId as string | undefined;
        session.user.id = (token.oktaUserId as string) || token.sub || '';
        session.user.firstName = token.firstName as string | undefined;
        session.user.displayName = token.displayName as string | undefined;

        // Fetch latest admin status from database (in case it changed)
        // If user exists in DB, they have access (they're in an access group)
        if (token.dbUserId) {
          try {
            const dbUser = await db.user.findUnique({
              where: { id: token.dbUserId as string },
              select: { isAdmin: true, firstName: true, displayName: true, title: true },
            });
            if (dbUser) {
              session.user.isAdmin = dbUser.isAdmin;
              session.user.hasAccess = true;
              session.user.firstName = dbUser.firstName;
              session.user.displayName = dbUser.displayName;
              session.user.title = dbUser.title ?? undefined;
            } else {
              // User was removed from DB (no longer in access groups)
              session.user.isAdmin = false;
              session.user.hasAccess = false;
            }
          } catch {
            // Fallback to token values if DB query fails
            session.user.isAdmin = token.isAdmin || false;
            session.user.hasAccess = token.hasAccess || false;
          }
        } else {
          session.user.isAdmin = token.isAdmin || false;
          session.user.hasAccess = token.hasAccess || false;
        }
      }
      return session;
    },
  },

  debug: process.env.NODE_ENV === 'development',
});
