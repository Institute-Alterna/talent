/**
 * User Stats API Route
 *
 * GET /api/users/stats - Get user statistics (admin only)
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-helpers';
import { getUserStats } from '@/lib/services/users';

/**
 * GET /api/users/stats
 *
 * Get user statistics for admin dashboard.
 */
export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.error;

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
