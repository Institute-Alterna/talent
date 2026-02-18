/**
 * Complete Interview API Route
 *
 * POST /api/applications/[id]/complete-interview
 *
 * Mark an existing interview as completed with notes.
 *
 * Body:
 * - notes: Required interview notes (max 2000 chars)
 *
 * Required: Authenticated user with app access
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAccess } from '@/lib/api-helpers';
import { getApplicationDetail } from '@/lib/services/applications';
import { logInterviewCompleted } from '@/lib/audit';
import { db } from '@/lib/db';
import { sanitizeForLog, requireString, RequiredFieldError, sanitizeText } from '@/lib/security';
import { isValidUUID } from '@/lib/utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/applications/[id]/complete-interview
 *
 * Mark interview as completed with notes.
 * Requires authenticated user (hiring manager or admin).
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    // Validate ID format
    if (!isValidUUID(id)) {
      console.error('[Complete Interview] Invalid UUID format:', sanitizeForLog(id));
      return NextResponse.json(
        { error: 'Invalid application ID format' },
        { status: 400 }
      );
    }

    const auth = await requireAccess();
    if (!auth.ok) return auth.error;
    const { session } = auth;

    // Get application details
    const application = await getApplicationDetail(id);
    if (!application) {
      console.error('[Complete Interview] Application not found:', sanitizeForLog(id));
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Get existing interview
    const existingInterview = await db.interview.findFirst({
      where: {
        applicationId: id,
        completedAt: null, // Only complete non-completed interviews
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!existingInterview) {
      console.error('[Complete Interview] No active interview found for application:', sanitizeForLog(id));
      return NextResponse.json(
        { error: 'No active interview found to complete' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields — requireString prevents non-string truthy bypass
    let notes: string;
    try {
      notes = requireString(body.notes, 'notes');
    } catch (e) {
      if (e instanceof RequiredFieldError) {
        return NextResponse.json(
          { error: 'Interview notes are required' },
          { status: 400 }
        );
      }
      throw e;
    }

    // Sanitize notes (max 2000 chars)
    const sanitizedNotes = sanitizeText(notes.trim(), 2000);
    if (!sanitizedNotes) {
      return NextResponse.json(
        { error: 'Interview notes are required' },
        { status: 400 }
      );
    }

    // Update interview record
    const completedInterview = await db.interview.update({
      where: { id: existingInterview.id },
      data: {
        completedAt: new Date(),
        notes: sanitizedNotes,
        updatedAt: new Date(),
      },
    });

    // Log the interview completion
    await logInterviewCompleted(
      id,
      application.personId,
      existingInterview.interviewerId,
      session.user.dbUserId
    );

    console.log('[Complete Interview] Success:', {
      applicationId: sanitizeForLog(id),
      interviewId: sanitizeForLog(existingInterview.id),
      completedBy: sanitizeForLog(session.user.email),
    });

    return NextResponse.json({
      success: true,
      message: 'Interview marked as completed',
      interview: {
        id: completedInterview.id,
        completedAt: completedInterview.completedAt,
        notes: completedInterview.notes,
      },
    });
  } catch (error) {
    console.error('[Complete Interview] Error:', sanitizeForLog(error instanceof Error ? error.message : 'Unknown error'));
    return NextResponse.json(
      {
        error: 'Failed to complete interview',
        details: error instanceof Error ? sanitizeForLog(error.message) : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
