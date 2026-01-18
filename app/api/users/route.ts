/**
 * Users API Routes
 *
 * GET /api/users - List all users (admin only)
 *
 * Supports query parameters:
 * - search: Search by name or email
 * - isAdmin: Filter by admin status ("true" or "false")
 * - limit: Maximum number of results (default: 100)
 * - offset: Pagination offset (default: 0)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUsers, getUserStats } from '@/lib/services/users';

/**
 * GET /api/users
 *
 * List all users. Requires admin access.
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check admin permission
    if (!session.user.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const isAdminParam = searchParams.get('isAdmin');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const isAdmin = isAdminParam === 'true' ? true : isAdminParam === 'false' ? false : undefined;

    // Fetch users
    const [users, stats] = await Promise.all([
      getUsers({ search, isAdmin, limit, offset }),
      getUserStats(),
    ]);

    return NextResponse.json({
      users,
      stats,
      pagination: {
        limit,
        offset,
        hasMore: users.length === limit,
      },
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
