/**
 * Okta Integration Client
 *
 * Provides methods for interacting with the Okta API for user management.
 * Used for syncing users from Okta to the local database.
 *
 * Access Control Groups:
 * - talent-access (OKTA_USER_GROUP_ID): Hiring Managers - can view candidates
 * - talent-administration (ADMIN_OKTA_GROUP_ID): Administrators - full access
 *
 * Only users in at least one of these groups have access to the Talent app.
 *
 * Required environment variables:
 * - OKTA_DOMAIN: Your Okta domain (e.g., alterna.okta.com)
 * - OKTA_API_TOKEN: Okta API token with appropriate permissions
 * - OKTA_USER_GROUP_ID: Group ID for hiring managers (talent-access)
 * - ADMIN_OKTA_GROUP_ID: Group ID for admin users (talent-administration)
 */

import type { OktaUserProfile } from '@/types/user';

/**
 * Okta API error response
 */
interface OktaErrorResponse {
  errorCode: string;
  errorSummary: string;
  errorLink?: string;
  errorId?: string;
  errorCauses?: Array<{
    errorSummary: string;
  }>;
}

/**
 * Error thrown when Okta API calls fail
 */
export class OktaApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode?: string,
    public errorId?: string
  ) {
    super(message);
    this.name = 'OktaApiError';
  }
}

/**
 * Get Okta configuration from environment
 */
function getOktaConfig() {
  const domain = process.env.OKTA_DOMAIN;
  const apiToken = process.env.OKTA_API_TOKEN;
  const adminGroupId = process.env.ADMIN_OKTA_GROUP_ID;
  const userGroupId = process.env.OKTA_USER_GROUP_ID;

  if (!domain) {
    throw new Error('OKTA_DOMAIN environment variable is not set');
  }

  if (!apiToken) {
    throw new Error('OKTA_API_TOKEN environment variable is not set');
  }

  return {
    domain,
    apiToken,
    adminGroupId,
    userGroupId,
    baseUrl: `https://${domain}/api/v1`,
  };
}

/**
 * Make an authenticated request to the Okta API
 */
async function oktaFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const config = getOktaConfig();
  const url = endpoint.startsWith('http') ? endpoint : `${config.baseUrl}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `SSWS ${config.apiToken}`,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null) as OktaErrorResponse | null;
    throw new OktaApiError(
      errorBody?.errorSummary || `Okta API request failed: ${response.statusText}`,
      response.status,
      errorBody?.errorCode,
      errorBody?.errorId
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as T;
}

/**
 * Make an authenticated request to the Okta API and handle pagination
 * Returns all results across all pages
 */
async function oktaFetchAll<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T[]> {
  const config = getOktaConfig();
  let url: string = endpoint.startsWith('http') ? endpoint : `${config.baseUrl}${endpoint}`;
  const allResults: T[] = [];

  while (url) {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `SSWS ${config.apiToken}`,
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null) as OktaErrorResponse | null;
      throw new OktaApiError(
        errorBody?.errorSummary || `Okta API request failed: ${response.statusText}`,
        response.status,
        errorBody?.errorCode,
        errorBody?.errorId
      );
    }

    const data = await response.json() as T[];
    allResults.push(...data);

    // Parse Link header for pagination
    const linkHeader = response.headers.get('Link');
    url = '';

    if (linkHeader) {
      // Parse the Link header to find 'next' relation
      const links = linkHeader.split(',');
      for (const link of links) {
        const match = link.match(/<([^>]+)>;\s*rel="next"/);
        if (match) {
          url = match[1];
          break;
        }
      }
    }
  }

  return allResults;
}

/**
 * Get all users from Okta (handles pagination automatically)
 *
 * @param options - Query options
 * @returns Array of Okta user profiles
 */
export async function getOktaUsers(options?: {
  limit?: number;
  filter?: string;
  search?: string;
}): Promise<OktaUserProfile[]> {
  const params = new URLSearchParams();

  // Use a larger limit for efficiency (max 200 per Okta docs)
  params.set('limit', (options?.limit || 200).toString());

  if (options?.filter) {
    params.set('filter', options.filter);
  }
  if (options?.search) {
    params.set('search', options.search);
  }

  const queryString = params.toString();
  const endpoint = `/users${queryString ? `?${queryString}` : ''}`;

  // Use paginated fetch to get all users
  return oktaFetchAll<OktaUserProfile>(endpoint);
}

/**
 * Get a single user from Okta by ID
 *
 * @param userId - Okta user ID
 * @returns Okta user profile
 */
export async function getOktaUser(userId: string): Promise<OktaUserProfile> {
  return oktaFetch<OktaUserProfile>(`/users/${userId}`);
}

/**
 * Get a user from Okta by email (login)
 *
 * @param email - User email address
 * @returns Okta user profile or null if not found
 */
export async function getOktaUserByEmail(email: string): Promise<OktaUserProfile | null> {
  try {
    return await oktaFetch<OktaUserProfile>(`/users/${encodeURIComponent(email)}`);
  } catch (error) {
    if (error instanceof OktaApiError && error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Get members of the admin group
 *
 * @returns Array of Okta user IDs that are admins
 */
export async function getAdminGroupMembers(): Promise<string[]> {
  const config = getOktaConfig();

  if (!config.adminGroupId) {
    console.warn('ADMIN_OKTA_GROUP_ID not set - cannot fetch admin group members');
    return [];
  }

  try {
    const users = await oktaFetchAll<OktaUserProfile>(
      `/groups/${config.adminGroupId}/users?limit=200`
    );
    return users.map((user) => user.id);
  } catch (error) {
    if (error instanceof OktaApiError && error.statusCode === 404) {
      console.warn('Admin group not found in Okta');
      return [];
    }
    throw error;
  }
}

/**
 * Get members of the user access group (talent-access / hiring managers)
 *
 * @returns Array of Okta user IDs that have basic app access
 */
export async function getUserGroupMembers(): Promise<string[]> {
  const config = getOktaConfig();

  if (!config.userGroupId) {
    console.warn('OKTA_USER_GROUP_ID not set - cannot fetch user group members');
    return [];
  }

  try {
    const users = await oktaFetchAll<OktaUserProfile>(
      `/groups/${config.userGroupId}/users?limit=200`
    );
    return users.map((user) => user.id);
  } catch (error) {
    if (error instanceof OktaApiError && error.statusCode === 404) {
      console.warn('User group not found in Okta');
      return [];
    }
    throw error;
  }
}

/**
 * Check if a user is in the admin group
 *
 * @param oktaUserId - Okta user ID
 * @returns true if user is in admin group
 */
export async function isUserAdmin(oktaUserId: string): Promise<boolean> {
  const adminMembers = await getAdminGroupMembers();
  return adminMembers.includes(oktaUserId);
}

/**
 * Check if a user has access to the Talent app
 *
 * @param oktaUserId - Okta user ID
 * @returns Object with hasAccess and isAdmin flags
 */
export async function checkUserAppAccess(oktaUserId: string): Promise<{
  hasAccess: boolean;
  isAdmin: boolean;
}> {
  const [adminIds, userIds] = await Promise.all([
    getAdminGroupMembers(),
    getUserGroupMembers(),
  ]);

  const isAdmin = adminIds.includes(oktaUserId);
  const isUser = userIds.includes(oktaUserId);

  return {
    hasAccess: isAdmin || isUser,
    isAdmin,
  };
}

/**
 * Okta user status type
 */
export type OktaUserStatus =
  | 'STAGED'
  | 'PROVISIONED'
  | 'ACTIVE'
  | 'RECOVERY'
  | 'LOCKED_OUT'
  | 'PASSWORD_EXPIRED'
  | 'SUSPENDED'
  | 'DEPROVISIONED';

/**
 * Get all users from Okta directory with their role/access information
 *
 * Returns ALL users in the Okta directory (including deprovisioned/dismissed),
 * with flags indicating:
 * - isAdmin: user is in talent-administration group
 * - hasAppAccess: user is in talent-access OR talent-administration group
 *
 * Note: Okta's /users endpoint excludes deprovisioned users by default,
 * so we make a separate call to include them.
 *
 * @returns Array of all Okta users with role information
 */
export async function getAllOktaUsersWithAdminStatus(): Promise<
  Array<{
    oktaUserId: string;
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
    isAdmin: boolean;
    hasAppAccess: boolean;
    oktaStatus: OktaUserStatus;
  }>
> {
  // Fetch group members and all users in parallel
  // We need to fetch deprovisioned users separately as Okta excludes them by default
  const [adminIds, userIds, activeUsers, deprovisionedUsers] = await Promise.all([
    getAdminGroupMembers(),
    getUserGroupMembers(),
    getOktaUsers(), // Gets all users except deprovisioned
    getOktaUsers({ filter: 'status eq "DEPROVISIONED"' }), // Get deprovisioned users
  ]);

  // Combine active and deprovisioned users
  const allUsers = [...activeUsers, ...deprovisionedUsers];

  // Map ALL users with their role information
  return allUsers.map((user) => {
    const isAdmin = adminIds.includes(user.id);
    const isHiringManager = userIds.includes(user.id);

    return {
      oktaUserId: user.id,
      email: user.profile.email,
      firstName: user.profile.firstName,
      middleName: user.profile.middleName,
      lastName: user.profile.lastName,
      displayName: user.profile.displayName,
      title: user.profile.title,
      city: user.profile.city,
      state: user.profile.state,
      countryCode: user.profile.countryCode,
      preferredLanguage: user.profile.preferredLanguage,
      timezone: user.profile.timezone,
      isAdmin,
      hasAppAccess: isAdmin || isHiringManager,
      oktaStatus: user.status as OktaUserStatus,
    };
  });
}

/**
 * Alias for getAllOktaUsersWithAdminStatus
 */
export const getTalentAppUsers = getAllOktaUsersWithAdminStatus;

/**
 * Update a user in Okta
 *
 * @param userId - Okta user ID
 * @param profile - Profile fields to update
 */
export async function updateOktaUser(
  userId: string,
  profile: Partial<OktaUserProfile['profile']>
): Promise<OktaUserProfile> {
  return oktaFetch<OktaUserProfile>(`/users/${userId}`, {
    method: 'POST',
    body: JSON.stringify({ profile }),
  });
}

/**
 * Create a user in Okta (for hired candidates)
 *
 * @param userData - User data for creation
 * @returns Created Okta user profile
 */
export async function createOktaUser(userData: {
  email: string;
  firstName: string;
  lastName: string;
  login?: string;
}): Promise<OktaUserProfile> {
  return oktaFetch<OktaUserProfile>('/users?activate=true', {
    method: 'POST',
    body: JSON.stringify({
      profile: {
        login: userData.login || userData.email,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
      },
    }),
  });
}

/**
 * Add a user to an Okta group
 *
 * @param userId - Okta user ID
 * @param groupId - Okta group ID
 */
export async function addUserToGroup(userId: string, groupId: string): Promise<void> {
  await oktaFetch(`/groups/${groupId}/users/${userId}`, {
    method: 'PUT',
  });
}

/**
 * Remove a user from an Okta group
 *
 * @param userId - Okta user ID
 * @param groupId - Okta group ID
 */
export async function removeUserFromGroup(userId: string, groupId: string): Promise<void> {
  await oktaFetch(`/groups/${groupId}/users/${userId}`, {
    method: 'DELETE',
  });
}

/**
 * Get the groups a user belongs to
 *
 * @param userId - Okta user ID
 * @returns Array of group IDs the user belongs to
 */
export async function getUserGroups(userId: string): Promise<string[]> {
  interface OktaGroup {
    id: string;
    profile: {
      name: string;
    };
  }
  
  const groups = await oktaFetch<OktaGroup[]>(`/users/${userId}/groups`);
  return groups.map(g => g.id);
}

/**
 * Check if a user is in a specific group
 *
 * @param userId - Okta user ID
 * @param groupId - Okta group ID
 * @returns true if user is in the group
 */
export async function isUserInGroup(userId: string, groupId: string): Promise<boolean> {
  const groups = await getUserGroups(userId);
  return groups.includes(groupId);
}

/**
 * Add a user to the talent-access group (grant app access)
 *
 * @param oktaUserId - Okta user ID
 * @throws Error if OKTA_USER_GROUP_ID is not configured
 */
export async function grantTalentAppAccess(oktaUserId: string): Promise<void> {
  const config = getOktaConfig();

  if (!config.userGroupId) {
    throw new Error('OKTA_USER_GROUP_ID environment variable is not set');
  }

  await addUserToGroup(oktaUserId, config.userGroupId);
}

/**
 * Add a user to the talent-administration group (grant admin access)
 *
 * @param oktaUserId - Okta user ID
 * @throws Error if ADMIN_OKTA_GROUP_ID is not configured
 */
export async function grantAdminAccess(oktaUserId: string): Promise<void> {
  const config = getOktaConfig();

  if (!config.adminGroupId) {
    throw new Error('ADMIN_OKTA_GROUP_ID environment variable is not set');
  }

  await addUserToGroup(oktaUserId, config.adminGroupId);
}

/**
 * Remove a user from the talent-administration group (revoke admin access)
 *
 * @param oktaUserId - Okta user ID
 * @throws Error if ADMIN_OKTA_GROUP_ID is not configured
 */
export async function revokeAdminAccess(oktaUserId: string): Promise<void> {
  const config = getOktaConfig();

  if (!config.adminGroupId) {
    throw new Error('ADMIN_OKTA_GROUP_ID environment variable is not set');
  }

  await removeUserFromGroup(oktaUserId, config.adminGroupId);
}

/**
 * Remove a user from the talent-access group (revoke app access for hiring managers)
 *
 * @param oktaUserId - Okta user ID
 * @throws Error if OKTA_USER_GROUP_ID is not configured
 */
export async function revokeTalentAppAccess(oktaUserId: string): Promise<void> {
  const config = getOktaConfig();

  if (!config.userGroupId) {
    throw new Error('OKTA_USER_GROUP_ID environment variable is not set');
  }

  await removeUserFromGroup(oktaUserId, config.userGroupId);
}

/**
 * Check if user has the talent-access group
 *
 * @param oktaUserId - Okta user ID
 * @returns true if user is in talent-access group
 */
export async function hasUserTalentAccessGroup(oktaUserId: string): Promise<boolean> {
  const config = getOktaConfig();

  if (!config.userGroupId) {
    return false;
  }

  return isUserInGroup(oktaUserId, config.userGroupId);
}

/**
 * Revoke all app access - removes user from both admin and talent-access groups
 *
 * @param oktaUserId - Okta user ID
 * @returns Object with info about which groups were removed
 */
export async function revokeAllAppAccess(oktaUserId: string): Promise<{
  removedAdmin: boolean;
  removedTalentAccess: boolean;
}> {
  const config = getOktaConfig();
  const userGroups = await getUserGroups(oktaUserId);
  
  let removedAdmin = false;
  let removedTalentAccess = false;

  // Remove from admin group if present
  if (config.adminGroupId && userGroups.includes(config.adminGroupId)) {
    await removeUserFromGroup(oktaUserId, config.adminGroupId);
    removedAdmin = true;
  }

  // Remove from talent-access group if present
  if (config.userGroupId && userGroups.includes(config.userGroupId)) {
    await removeUserFromGroup(oktaUserId, config.userGroupId);
    removedTalentAccess = true;
  }

  return { removedAdmin, removedTalentAccess };
}

/**
 * Check if Okta integration is configured
 *
 * @returns true if all required environment variables are set
 */
export function isOktaConfigured(): boolean {
  return !!(process.env.OKTA_DOMAIN && process.env.OKTA_API_TOKEN);
}

/**
 * Test Okta API connectivity
 *
 * @returns true if connection is successful
 */
export async function testOktaConnection(): Promise<boolean> {
  try {
    // Try to fetch current user (requires valid API token)
    await oktaFetch('/users?limit=1');
    return true;
  } catch (error) {
    console.error('Okta connection test failed:', error);
    return false;
  }
}
