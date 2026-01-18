/**
 * User Stats API Route
 *
 * GET /api/users/stats - Get user statistics (admin only)
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserStats } from '@/lib/services/users';

/**
 * GET /api/users/stats
 *
 * Get user statistics for admin dashboard.
 */
export async function GET() {
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

    const stats = await getUserStats();
    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
