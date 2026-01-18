/**
 * Debug API Route for Database Users
 *
 * This endpoint shows users in the database.
 * ONLY available in development mode.
 *
 * GET /api/debug/users
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  try {
    const users = await db.user.findMany({
      select: {
        id: true,
        oktaUserId: true,
        email: true,
        displayName: true,
        isAdmin: true,
        hasAppAccess: true,
        oktaStatus: true,
        lastSyncedAt: true,
      },
      orderBy: { email: 'asc' },
    });

    return NextResponse.json({
      count: users.length,
      users,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
