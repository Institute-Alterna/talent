/**
 * User Types
 *
 * Type definitions for user management operations.
 */

import type { Clearance, OktaStatus } from '@/lib/generated/prisma/client';

/**
 * User data as returned from the database
 */
export interface User {
  id: string;
  oktaUserId: string;
  email: string;
  secondaryEmail: string | null;
  firstName: string;
  middleName: string | null;
  lastName: string;
  displayName: string;
  title: string | null;
  city: string | null;
  state: string | null;
  countryCode: string | null;
  preferredLanguage: string;
  timezone: string;
  organisation: string;
  operationalClearance: Clearance;
  isAdmin: boolean;
  hasAppAccess: boolean;
  schedulingLink: string | null;
  oktaStatus: OktaStatus;
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt: Date | null;
}

/**
 * User data for list views (abbreviated)
 */
export interface UserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  title: string | null;
  isAdmin: boolean;
  hasAppAccess: boolean;
  schedulingLink: string | null;
  oktaStatus: OktaStatus;
  lastSyncedAt: Date | null;
  createdAt: Date;
}

/**
 * Data required to create a user
 */
export interface CreateUserData {
  oktaUserId: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  secondaryEmail?: string;
  middleName?: string;
  title?: string;
  city?: string;
  state?: string;
  countryCode?: string;
  preferredLanguage?: string;
  timezone?: string;
  organisation?: string;
  operationalClearance?: Clearance;
  isAdmin?: boolean;
  schedulingLink?: string;
}

/**
 * Data for updating a user (admin operations)
 */
export interface UpdateUserData {
  email?: string;
  secondaryEmail?: string | null;
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  displayName?: string;
  title?: string | null;
  city?: string | null;
  state?: string | null;
  countryCode?: string | null;
  preferredLanguage?: string;
  timezone?: string;
  operationalClearance?: Clearance;
  isAdmin?: boolean;
  hasAppAccess?: boolean;
  schedulingLink?: string | null;
}

/**
 * Data for updating own profile (non-admin)
 */
export interface UpdateProfileData {
  schedulingLink?: string | null;
}

/**
 * User statistics for admin dashboard
 */
export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  dismissed: number;
  admins: number;
  hiringManagers: number;
  withSchedulingLink: number;
  lastSyncedAt: Date | null;
}

/**
 * Okta user profile from API
 */
export interface OktaUserProfile {
  id: string;
  status: string;
  created: string;
  activated: string | null;
  lastLogin: string | null;
  lastUpdated: string;
  profile: {
    login: string;
    email: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    displayName?: string;
    title?: string;
    city?: string;
    state?: string;
    countryCode?: string;
    preferredLanguage?: string;
    timezone?: string;
  };
}
