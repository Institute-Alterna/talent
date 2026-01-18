/**
 * Individual User API Routes
 *
 * GET /api/users/[id] - Get user details
 * PUT /api/users/[id] - Update user (admin only)
 * DELETE /api/users/[id] - Delete user (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUserById, updateUser, deleteUser } from '@/lib/services/users';
import { Clearance } from '@/lib/generated/prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/users/[id]
 *
 * Get a single user by ID.
 * Users can view their own profile; admins can view any user.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Users can view their own profile, admins can view any user
    const isOwnProfile = session.user.dbUserId === id;
    if (!isOwnProfile && !session.user.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const user = await getUserById(id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/users/[id]
 *
 * Update a user. Admins can update any user; users can only update
 * their own scheduling link.
 */
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const isOwnProfile = session.user.dbUserId === id;

    // Non-admins can only update their own scheduling link
    if (!session.user.isAdmin) {
      if (!isOwnProfile) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }

      // Only allow scheduling link update for non-admins
      const { schedulingLink } = body;
      if (Object.keys(body).length !== 1 || !('schedulingLink' in body)) {
        return NextResponse.json(
          { error: 'You can only update your scheduling link' },
          { status: 403 }
        );
      }

      const user = await updateUser(id, { schedulingLink });
      return NextResponse.json({ user });
    }

    // Admin update - validate fields
    const allowedFields = [
      'email',
      'secondaryEmail',
      'firstName',
      'middleName',
      'lastName',
      'displayName',
      'title',
      'city',
      'state',
      'countryCode',
      'preferredLanguage',
      'timezone',
      'operationalClearance',
      'isAdmin',
      'schedulingLink',
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    // Validate operationalClearance if provided
    if (updateData.operationalClearance) {
      const validClearances: Clearance[] = ['A', 'B', 'C'];
      if (!validClearances.includes(updateData.operationalClearance as Clearance)) {
        return NextResponse.json(
          { error: 'Invalid operational clearance value' },
          { status: 400 }
        );
      }
    }

    // Validate isAdmin is boolean if provided
    if ('isAdmin' in updateData && typeof updateData.isAdmin !== 'boolean') {
      return NextResponse.json(
        { error: 'isAdmin must be a boolean' },
        { status: 400 }
      );
    }

    const user = await updateUser(id, updateData);
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error updating user:', error);

    // Handle not found
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[id]
 *
 * Delete a user. Admin only, cannot delete self.
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

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

    // Cannot delete self
    if (session.user.dbUserId === id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Check user exists
    const existingUser = await getUserById(id);
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    await deleteUser(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
