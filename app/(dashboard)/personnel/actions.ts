'use server';

/**
 * User Management Server Actions
 *
 * Server actions for managing users from the admin dashboard.
 */

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { isValidUUID } from '@/lib/utils';
import {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserStats,
  syncUsersFromOkta,
} from '@/lib/services/users';
import { cleanupSeedData } from '@/lib/services/seed-cleanup';
import {
  isOktaConfigured,
  getAllOktaUsersWithAdminStatus,
  grantTalentAppAccess,
  grantAdminAccess,
  revokeAdminAccess,
  revokeAllAppAccess,
  hasUserTalentAccessGroup,
} from '@/lib/integrations/okta';
import type { UserListItem, UserStats, UpdateUserData } from '@/types/user';
import type { OktaStatus, User } from '@/lib/generated/prisma/client';
import type { ActionResult } from '@/types/shared';

/** Map a Prisma User to the UserListItem shape returned to the client. */
function toUserListItem(user: User): UserListItem {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName,
    title: user.title,
    isAdmin: user.isAdmin,
    hasAppAccess: user.hasAppAccess,
    schedulingLink: user.schedulingLink,
    oktaStatus: user.oktaStatus,
    lastSyncedAt: user.lastSyncedAt,
    createdAt: user.createdAt,
  };
}

/**
 * Shared guard for role-management actions.
 * Validates UUID, auth, Okta config, optional self-action prevention,
 * and user existence before delegating to the action-specific logic.
 */
async function withRoleActionGuard(
  id: string,
  options: { preventSelfAction?: boolean },
  fn: (currentUser: User) => Promise<ActionResult<{ user: UserListItem }>>,
): Promise<ActionResult<{ user: UserListItem }>> {
  if (!isValidUUID(id)) {
    return { success: false, error: 'Invalid user ID format' };
  }

  const session = await auth();
  if (!session?.user?.isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!isOktaConfigured()) {
    return { success: false, error: 'Okta integration is not configured' };
  }

  if (options.preventSelfAction && session.user.dbUserId === id) {
    return { success: false, error: 'Cannot perform this action on your own account' };
  }

  const currentUser = await getUserById(id);
  if (!currentUser) {
    return { success: false, error: 'User not found' };
  }

  try {
    return await fn(currentUser);
  } catch (error) {
    console.error(`Role action error for ${id}:`, error);
    return { success: false, error: 'Action failed' };
  }
}

/**
 * Fetch all users for the admin dashboard
 */
export async function fetchUsers(options?: {
  search?: string;
  isAdmin?: boolean;
  oktaStatus?: OktaStatus | 'ALL' | 'DISMISSED' | 'INACTIVE';
}): Promise<ActionResult<{ users: UserListItem[]; stats: UserStats }>> {
  try {
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    const [users, stats] = await Promise.all([
      getUsers(options),
      getUserStats(),
    ]);

    return { success: true, data: { users, stats } };
  } catch (error) {
    console.error('Error fetching users:', error);
    return { success: false, error: 'Failed to fetch users' };
  }
}

/**
 * Fetch a single user by ID
 */
export async function fetchUser(id: string): Promise<ActionResult<{ user: Awaited<ReturnType<typeof getUserById>> }>> {
  try {
    // Validate UUID format to prevent invalid database queries
    if (!isValidUUID(id)) {
      return { success: false, error: 'Invalid user ID format' };
    }

    const session = await auth();
    if (!session?.user?.isAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    const user = await getUserById(id);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    return { success: true, data: { user } };
  } catch (error) {
    console.error('Error fetching user:', error);
    return { success: false, error: 'Failed to fetch user' };
  }
}

/**
 * Update a user
 */
export async function updateUserAction(
  id: string,
  data: UpdateUserData
): Promise<ActionResult<{ user: Awaited<ReturnType<typeof updateUser>> }>> {
  try {
    // Validate UUID format to prevent invalid database queries
    if (!isValidUUID(id)) {
      return { success: false, error: 'Invalid user ID format' };
    }

    const session = await auth();
    if (!session?.user?.isAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    const user = await updateUser(id, data);
    revalidatePath('/personnel');
    return { success: true, data: { user } };
  } catch (error) {
    console.error('Error updating user:', error);
    return { success: false, error: 'Failed to update user' };
  }
}

/**
 * Delete a user
 */
export async function deleteUserAction(id: string): Promise<ActionResult<void>> {
  try {
    // Validate UUID format to prevent invalid database queries
    if (!isValidUUID(id)) {
      return { success: false, error: 'Invalid user ID format' };
    }

    const session = await auth();
    if (!session?.user?.isAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    // Cannot delete self
    if (session.user.dbUserId === id) {
      return { success: false, error: 'Cannot delete your own account' };
    }

    await deleteUser(id);
    revalidatePath('/personnel');
    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    return { success: false, error: 'Failed to delete user' };
  }
}

/**
 * Sync users from Okta
 *
 * Syncs ALL users from the Okta directory to the local database.
 * Updates their role information based on group membership.
 * Removes users from the database that no longer exist in Okta.
 * Also cleans up seed/sample data to prepare the app for production.
 */
export async function syncFromOktaAction(): Promise<ActionResult<{ synced: number; removed: number; seedDataCleaned: boolean }>> {
  try {
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!isOktaConfigured()) {
      return { success: false, error: 'Okta integration is not configured' };
    }

    // Get ALL users from Okta with their role information
    const oktaUsers = await getAllOktaUsersWithAdminStatus();
    
    console.log(`[Sync] Fetched ${oktaUsers.length} users from Okta`);
    
    const { synced, removed } = await syncUsersFromOkta(oktaUsers, session.user.dbUserId);

    console.log(`[Sync] Completed: ${synced} users synced, ${removed} users removed`);

    // Clean up seed data after successful sync to make app production-ready
    const seedCleanupResult = await cleanupSeedData(session.user.dbUserId);
    const seedDataCleaned = 
      seedCleanupResult.usersRemoved > 0 ||
      seedCleanupResult.personsRemoved > 0 ||
      seedCleanupResult.applicationsRemoved > 0;

    if (seedDataCleaned) {
      console.log(`[Sync] Seed data cleaned: ${seedCleanupResult.usersRemoved} users, ${seedCleanupResult.personsRemoved} persons, ${seedCleanupResult.applicationsRemoved} applications removed`);
    }

    revalidatePath('/personnel');
    revalidatePath('/candidates');
    revalidatePath('/dashboard');
    return { success: true, data: { synced, removed, seedDataCleaned } };
  } catch (error) {
    console.error('Error syncing from Okta:', error);
    // Provide more detailed error message
    const errorMessage = error instanceof Error ? error.message : 'Failed to sync from Okta';
    return { success: false, error: errorMessage };
  }
}

/**
 * Make a user an administrator
 * Adds them to the talent-administration Okta group and updates local database
 */
export async function makeAdminAction(id: string): Promise<ActionResult<{ user: UserListItem }>> {
  return withRoleActionGuard(id, { preventSelfAction: true }, async (currentUser) => {
    if (currentUser.isAdmin) {
      return { success: false, error: 'User is already an administrator' };
    }

    await grantAdminAccess(currentUser.oktaUserId);
    const updatedUser = await updateUser(id, { isAdmin: true, hasAppAccess: true });

    revalidatePath('/personnel');
    return { success: true, data: { user: toUserListItem(updatedUser) } };
  });
}

/**
 * Revoke admin access from a user
 * Removes them from talent-administration group but keeps them as a hiring manager
 * Adds them to talent-access group if they don't have it already
 */
export async function revokeAdminAction(id: string): Promise<ActionResult<{ user: UserListItem }>> {
  return withRoleActionGuard(id, { preventSelfAction: true }, async (currentUser) => {
    if (!currentUser.isAdmin) {
      return { success: false, error: 'User is not an administrator' };
    }

    await revokeAdminAccess(currentUser.oktaUserId);

    // Ensure they keep talent-access group membership
    const hasTalentAccess = await hasUserTalentAccessGroup(currentUser.oktaUserId);
    if (!hasTalentAccess) {
      await grantTalentAppAccess(currentUser.oktaUserId);
    }

    const updatedUser = await updateUser(id, { isAdmin: false, hasAppAccess: true });

    revalidatePath('/personnel');
    return { success: true, data: { user: toUserListItem(updatedUser) } };
  });
}

/**
 * Grant app access to a user by adding them to the talent-access Okta group
 */
export async function grantAppAccessAction(id: string): Promise<ActionResult<{ user: UserListItem }>> {
  return withRoleActionGuard(id, {}, async (currentUser) => {
    if (currentUser.hasAppAccess) {
      return { success: false, error: 'User already has app access' };
    }

    await grantTalentAppAccess(currentUser.oktaUserId);
    const updatedUser = await updateUser(id, { hasAppAccess: true });

    revalidatePath('/personnel');
    return { success: true, data: { user: toUserListItem(updatedUser) } };
  });
}

/**
 * Revoke all app access from a user
 * Removes them from both talent-administration and talent-access groups
 */
export async function revokeAppAccessAction(id: string): Promise<ActionResult<{ user: UserListItem }>> {
  return withRoleActionGuard(id, { preventSelfAction: true }, async (currentUser) => {
    if (!currentUser.hasAppAccess && !currentUser.isAdmin) {
      return { success: false, error: 'User does not have app access' };
    }

    await revokeAllAppAccess(currentUser.oktaUserId);
    const updatedUser = await updateUser(id, { isAdmin: false, hasAppAccess: false });

    revalidatePath('/personnel');
    return { success: true, data: { user: toUserListItem(updatedUser) } };
  });
}
