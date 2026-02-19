'use server';

/**
 * Settings Page Server Actions
 *
 * Server actions for user settings management including:
 * - Updating scheduling link
 * - Fetching activity history
 */

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { isValidURL } from '@/lib/utils';
import { db } from '@/lib/db';
import { updateProfile, getUserById } from '@/lib/services/users';
import type { ActionType } from '@/lib/generated/prisma/client';

/**
 * Result type for server actions
 */
interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Activity log item for display
 */
export interface ActivityLogItem {
  id: string;
  action: string;
  actionType: ActionType;
  details: Record<string, unknown> | null;
  createdAt: Date;
  person?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  application?: {
    id: string;
    position: string;
  } | null;
}

/**
 * User profile data for settings
 */
export interface UserSettingsData {
  id: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  title: string | null;
  isAdmin: boolean;
  schedulingLink: string | null;
  timezone: string;
  preferredLanguage: string;
  createdAt: Date;
  lastSyncedAt: Date | null;
}

/**
 * Fetch current user's settings data
 */
export async function fetchUserSettings(): Promise<ActionResult<{ user: UserSettingsData }>> {
  try {
    const session = await auth();
    if (!session?.user?.dbUserId) {
      return { success: false, error: 'Not authenticated' };
    }

    const user = await getUserById(session.user.dbUserId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          firstName: user.firstName,
          lastName: user.lastName,
          title: user.title,
          isAdmin: user.isAdmin,
          schedulingLink: user.schedulingLink,
          timezone: user.timezone,
          preferredLanguage: user.preferredLanguage,
          createdAt: user.createdAt,
          lastSyncedAt: user.lastSyncedAt,
        },
      },
    };
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return { success: false, error: 'Failed to fetch user settings' };
  }
}

/**
 * Update the current user's scheduling link
 */
export async function updateSchedulingLinkAction(
  schedulingLink: string | null
): Promise<ActionResult<{ schedulingLink: string | null }>> {
  try {
    const session = await auth();
    if (!session?.user?.dbUserId) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate URL format if provided
    if (schedulingLink && schedulingLink.trim()) {
      if (!isValidURL(schedulingLink)) {
        return { success: false, error: 'Please enter a valid URL' };
      }
    }

    // Normalize empty string to null
    const normalizedLink = schedulingLink?.trim() || null;

    const updatedUser = await updateProfile(session.user.dbUserId, {
      schedulingLink: normalizedLink,
    });

    revalidatePath('/settings');
    revalidatePath('/personnel');

    return {
      success: true,
      data: { schedulingLink: updatedUser.schedulingLink },
    };
  } catch (error) {
    console.error('Error updating scheduling link:', error);
    return { success: false, error: 'Failed to update scheduling link' };
  }
}

/**
 * Fetch the current user's activity history
 */
export async function fetchUserActivityHistory(options?: {
  limit?: number;
  offset?: number;
}): Promise<ActionResult<{ activities: ActivityLogItem[]; total: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.dbUserId) {
      return { success: false, error: 'Not authenticated' };
    }

    const { limit = 20, offset = 0 } = options || {};

    const [activities, total] = await Promise.all([
      db.auditLog.findMany({
        where: { userId: session.user.dbUserId },
        select: {
          id: true,
          action: true,
          actionType: true,
          details: true,
          createdAt: true,
          person: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          application: {
            select: {
              id: true,
              position: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.auditLog.count({
        where: { userId: session.user.dbUserId },
      }),
    ]);

    return {
      success: true,
      data: {
        activities: activities.map((a) => ({
          ...a,
          details: a.details as Record<string, unknown> | null,
        })),
        total,
      },
    };
  } catch (error) {
    console.error('Error fetching activity history:', error);
    return { success: false, error: 'Failed to fetch activity history' };
  }
}
