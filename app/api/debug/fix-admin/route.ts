/**
 * Debug API Route to Fix Admin Status
 *
 * This endpoint syncs admin status from Okta for all users.
 * ONLY available in development mode.
 *
 * POST /api/debug/fix-admin
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminGroupMembers } from '@/lib/integrations/okta';

export async function POST() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    // Get all admin Okta IDs from the group
    const adminOktaIds = await getAdminGroupMembers();
    console.log('[Fix Admin] Admin group members:', adminOktaIds);

    // Get all users from database
    const users = await db.user.findMany({
      select: {
        id: true,
        oktaUserId: true,
        email: true,
        isAdmin: true,
      },
    });

    const updates: Array<{ email: string; wasAdmin: boolean; nowAdmin: boolean }> = [];

    // Update each user's admin status
    for (const user of users) {
      const shouldBeAdmin = adminOktaIds.includes(user.oktaUserId);

      if (user.isAdmin !== shouldBeAdmin) {
        await db.user.update({
          where: { id: user.id },
          data: { isAdmin: shouldBeAdmin },
        });

        updates.push({
          email: user.email,
          wasAdmin: user.isAdmin,
          nowAdmin: shouldBeAdmin,
        });
      }
    }

    return NextResponse.json({
      message: 'Admin status synced',
      adminOktaIds,
      updates,
    });
  } catch (error) {
    console.error('[Fix Admin] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
