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

/**
 * Extended session user type with our custom fields
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
      isAdmin: boolean;
      dbUserId?: string;
    };
  }

  interface User {
    isAdmin?: boolean;
    dbUserId?: string;
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    isAdmin?: boolean;
    dbUserId?: string;
    oktaUserId?: string;
  }
}

/**
 * Check if a user is an admin by checking Okta group membership
 *
 * @param accessToken - The OAuth access token from Okta
 * @returns true if user is in the admin group
 */
async function checkAdminStatus(accessToken: string): Promise<boolean> {
  const adminGroupId = process.env.ADMIN_OKTA_GROUP_ID;
  if (!adminGroupId) {
    console.warn('ADMIN_OKTA_GROUP_ID not set - no users will be admins');
    return false;
  }

  try {
    // Use Okta API to check user's group membership
    const oktaDomain = process.env.OKTA_DOMAIN;
    const response = await fetch(`https://${oktaDomain}/oauth2/v1/userinfo`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch user info from Okta:', response.statusText);
      return false;
    }

    const userInfo = await response.json();

    // Check if user has groups claim and is in admin group
    // Note: You may need to configure Okta to include groups in the token
    const groups = userInfo.groups || [];
    return groups.includes(adminGroupId);
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Sync user data from Okta to local database
 *
 * Creates a new user record if one doesn't exist, or updates the existing one.
 *
 * @param oktaProfile - The user profile from Okta
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
  const firstName = oktaProfile.given_name || oktaProfile.name?.split(' ')[0] || 'Unknown';
  const lastName = oktaProfile.family_name || oktaProfile.name?.split(' ').slice(1).join(' ') || '';
  const displayName = oktaProfile.name || oktaProfile.preferred_username || email;

  try {
    // Try to find existing user
    const existingUser = await db.user.findUnique({
      where: { oktaUserId },
    });

    if (existingUser) {
      // Update existing user
      const updatedUser = await db.user.update({
        where: { oktaUserId },
        data: {
          email,
          firstName,
          lastName,
          displayName,
          preferredLanguage: oktaProfile.locale || 'en',
          timezone: oktaProfile.zoneinfo || 'America/New_York',
          isAdmin,
          lastSyncedAt: new Date(),
        },
      });
      return updatedUser;
    } else {
      // Create new user
      const newUser = await db.user.create({
        data: {
          oktaUserId,
          email,
          firstName,
          lastName,
          displayName,
          preferredLanguage: oktaProfile.locale || 'en',
          timezone: oktaProfile.zoneinfo || 'America/New_York',
          organisation: 'Institute Alterna',
          isAdmin,
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

        // Check admin status
        const isAdmin = account.access_token
          ? await checkAdminStatus(account.access_token)
          : false;

        // Sync user to database
        try {
          const dbUser = await syncUserToDatabase(oktaProfile, isAdmin);
          token.dbUserId = dbUser.id;
          token.isAdmin = dbUser.isAdmin;
          token.oktaUserId = oktaProfile.sub;
        } catch (error) {
          console.error('Failed to sync user:', error);
          token.isAdmin = false;
        }
      }

      return token;
    },

    /**
     * Session callback - runs when session is checked
     *
     * Adds our custom fields to the session object
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.isAdmin = token.isAdmin || false;
        session.user.dbUserId = token.dbUserId as string | undefined;
        session.user.id = (token.oktaUserId as string) || token.sub || '';
      }
      return session;
    },
  },

  debug: process.env.NODE_ENV === 'development',
});
