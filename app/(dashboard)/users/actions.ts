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
import type { OktaStatus } from '@/lib/generated/prisma/client';

/**
 * Result type for server actions
 */
interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
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
    revalidatePath('/users');
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
    revalidatePath('/users');
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
 */
export async function syncFromOktaAction(): Promise<ActionResult<{ synced: number; removed: number }>> {
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

    revalidatePath('/users');
    return { success: true, data: { synced, removed } };
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
  try {
    // Validate UUID format to prevent invalid database queries
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

    // Cannot change own admin status
    if (session.user.dbUserId === id) {
      return { success: false, error: 'Cannot change your own admin status' };
    }

    const currentUser = await getUserById(id);
    if (!currentUser) {
      return { success: false, error: 'User not found' };
    }

    if (currentUser.isAdmin) {
      return { success: false, error: 'User is already an administrator' };
    }

    // Add user to talent-administration group in Okta
    await grantAdminAccess(currentUser.oktaUserId);

    // Update local database - admin always has app access
    const updatedUser = await updateUser(id, { isAdmin: true, hasAppAccess: true });
    
    revalidatePath('/users');
    
    // Return updated user for UI update
    return { 
      success: true, 
      data: { 
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          displayName: updatedUser.displayName,
          title: updatedUser.title,
          isAdmin: updatedUser.isAdmin,
          hasAppAccess: updatedUser.hasAppAccess,
          schedulingLink: updatedUser.schedulingLink,
          oktaStatus: updatedUser.oktaStatus,
          lastSyncedAt: updatedUser.lastSyncedAt,
          createdAt: updatedUser.createdAt,
        }
      } 
    };
  } catch (error) {
    console.error('Error making user admin:', error);
    return { success: false, error: 'Failed to make user admin' };
  }
}

/**
 * Revoke admin access from a user
 * Removes them from talent-administration group but keeps them as a hiring manager
 * Adds them to talent-access group if they don't have it already
 */
export async function revokeAdminAction(id: string): Promise<ActionResult<{ user: UserListItem }>> {
  try {
    // Validate UUID format to prevent invalid database queries
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

    // Cannot change own admin status
    if (session.user.dbUserId === id) {
      return { success: false, error: 'Cannot change your own admin status' };
    }

    const currentUser = await getUserById(id);
    if (!currentUser) {
      return { success: false, error: 'User not found' };
    }

    if (!currentUser.isAdmin) {
      return { success: false, error: 'User is not an administrator' };
    }

    // Remove from talent-administration group
    await revokeAdminAccess(currentUser.oktaUserId);

    // Check if they have talent-access group, if not add them to keep app access
    const hasTalentAccess = await hasUserTalentAccessGroup(currentUser.oktaUserId);
    if (!hasTalentAccess) {
      await grantTalentAppAccess(currentUser.oktaUserId);
    }

    // Update local database - no longer admin but still has app access as hiring manager
    const updatedUser = await updateUser(id, { isAdmin: false, hasAppAccess: true });
    
    revalidatePath('/users');
    
    return { 
      success: true, 
      data: { 
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          displayName: updatedUser.displayName,
          title: updatedUser.title,
          isAdmin: updatedUser.isAdmin,
          hasAppAccess: updatedUser.hasAppAccess,
          schedulingLink: updatedUser.schedulingLink,
          oktaStatus: updatedUser.oktaStatus,
          lastSyncedAt: updatedUser.lastSyncedAt,
          createdAt: updatedUser.createdAt,
        }
      } 
    };
  } catch (error) {
    console.error('Error revoking admin access:', error);
    return { success: false, error: 'Failed to revoke admin access' };
  }
}

/**
 * Grant app access to a user by adding them to the talent-access Okta group
 */
export async function grantAppAccessAction(id: string): Promise<ActionResult<{ user: UserListItem }>> {
  try {
    // Validate UUID format to prevent invalid database queries
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

    const user = await getUserById(id);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (user.hasAppAccess) {
      return { success: false, error: 'User already has app access' };
    }

    // Add user to talent-access group in Okta
    await grantTalentAppAccess(user.oktaUserId);

    // Update local database to reflect the change
    const updatedUser = await updateUser(id, { hasAppAccess: true });

    revalidatePath('/users');
    
    return { 
      success: true, 
      data: { 
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          displayName: updatedUser.displayName,
          title: updatedUser.title,
          isAdmin: updatedUser.isAdmin,
          hasAppAccess: updatedUser.hasAppAccess,
          schedulingLink: updatedUser.schedulingLink,
          oktaStatus: updatedUser.oktaStatus,
          lastSyncedAt: updatedUser.lastSyncedAt,
          createdAt: updatedUser.createdAt,
        }
      } 
    };
  } catch (error) {
    console.error('Error granting app access:', error);
    return { success: false, error: 'Failed to grant app access' };
  }
}

/**
 * Revoke all app access from a user
 * Removes them from both talent-administration and talent-access groups
 */
export async function revokeAppAccessAction(id: string): Promise<ActionResult<{ user: UserListItem }>> {
  try {
    // Validate UUID format to prevent invalid database queries
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

    // Cannot revoke own access
    if (session.user.dbUserId === id) {
      return { success: false, error: 'Cannot revoke your own app access' };
    }

    const user = await getUserById(id);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (!user.hasAppAccess && !user.isAdmin) {
      return { success: false, error: 'User does not have app access' };
    }

    // Remove from both groups in Okta
    await revokeAllAppAccess(user.oktaUserId);

    // Update local database - no longer admin and no app access
    const updatedUser = await updateUser(id, { isAdmin: false, hasAppAccess: false });

    revalidatePath('/users');
    
    return { 
      success: true, 
      data: { 
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          displayName: updatedUser.displayName,
          title: updatedUser.title,
          isAdmin: updatedUser.isAdmin,
          hasAppAccess: updatedUser.hasAppAccess,
          schedulingLink: updatedUser.schedulingLink,
          oktaStatus: updatedUser.oktaStatus,
          lastSyncedAt: updatedUser.lastSyncedAt,
          createdAt: updatedUser.createdAt,
        }
      } 
    };
  } catch (error) {
    console.error('Error revoking app access:', error);
    return { success: false, error: 'Failed to revoke app access' };
  }
}
