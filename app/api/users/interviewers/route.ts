/**
 * Interviewers API Route
 *
 * GET /api/users/interviewers
 *
 * Returns users who can be assigned as interviewers (active app users with a
 * non-empty scheduling link). Available to any authenticated user with app
 * access (hiring managers and admins).
 *
 * This is intentionally separate from GET /api/users (admin-only full personnel
 * list) so schedule/reschedule does not require admin privileges and does not
 * expose personnel management data to non-admins.
 */

import { NextResponse } from 'next/server';
import { requireAccess } from '@/lib/api-helpers';
import { getInterviewers } from '@/lib/services/users';
import { sanitizeForLog } from '@/lib/security';

/**
 * GET /api/users/interviewers
 *
 * List interviewers for the schedule/reschedule dialogs.
 * Requires app access (hiring manager or admin).
 */
export async function GET() {
  try {
    const auth = await requireAccess();
    if (!auth.ok) return auth.error;

    const interviewers = await getInterviewers();

    return NextResponse.json(
      { interviewers },
      {
        headers: {
          'Cache-Control': 'private, no-cache',
        },
      }
    );
  } catch (error) {
    console.error(
      'Error fetching interviewers:',
      sanitizeForLog(error instanceof Error ? error.message : 'Unknown error')
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
