/**
 * Okta Sync API Route
 *
 * POST /api/users/sync - Sync users from Okta (admin only)
 *
 * Fetches all active users from Okta and syncs them to the local database.
 * Updates existing users and creates new ones.
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { syncUsersFromOkta } from '@/lib/services/users';
import {
  isOktaConfigured,
  getAllOktaUsersWithAdminStatus,
} from '@/lib/integrations/okta';

/**
 * POST /api/users/sync
 *
 * Sync users from Okta to local database.
 */
export async function POST() {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Admin only
    if (!session.user.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Check Okta configuration
    if (!isOktaConfigured()) {
      return NextResponse.json(
        { error: 'Okta integration is not configured' },
        { status: 503 }
      );
    }

    // Fetch users from Okta with admin status
    const oktaUsers = await getAllOktaUsersWithAdminStatus();

    if (oktaUsers.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        removed: 0,
        message: 'No active users found in Okta',
      });
    }

    // Sync to local database - pass current user ID to prevent self-deletion
    const { synced, removed } = await syncUsersFromOkta(oktaUsers, session.user.dbUserId);

    return NextResponse.json({
      success: true,
      synced,
      removed,
      message: `Successfully synced ${synced} users from Okta, removed ${removed}`,
    });
  } catch (error) {
    console.error('Error syncing users from Okta:', error);

    // Handle specific Okta errors
    if (error instanceof Error) {
      if (error.message.includes('OKTA_')) {
        return NextResponse.json(
          { error: 'Okta configuration error: ' + error.message },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to sync users from Okta' },
      { status: 500 }
    );
  }
}
