/**
 * Complete Interview API Route
 *
 * POST /api/applications/[id]/complete-interview
 *
 * Mark an existing interview as completed with notes.
 *
 * Body:
 * - notes: Required interview notes (max 2,000 chars)
 *
 * Required: Authenticated user with app access
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApplicationAccess, parseJsonBody, type RouteParams } from '@/lib/api-helpers';
import { createAuditLog, logInterviewCompleted } from '@/lib/audit';
import { db } from '@/lib/db';
import { sanitizeForLog, requireString, RequiredFieldError, sanitizeText } from '@/lib/security';
import { isValidHttpsURL } from '@/lib/utils';
import { recruitment } from '@/config';

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
    const access = await requireApplicationAccess(params);
    if (!access.ok) return access.error;
    const { session, application } = access;

    // Get existing interview
    const existingInterview = await db.interview.findFirst({
      where: {
        applicationId: application.id,
        completedAt: null, // Only complete non-completed interviews
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!existingInterview) {
      console.error('[Complete Interview] No active interview found for application:', sanitizeForLog(application.id));
      return NextResponse.json(
        { error: 'No active interview found to complete' },
        { status: 404 }
      );
    }

    const isAssignedInterviewer =
      typeof session.user.dbUserId === 'string' &&
      session.user.dbUserId === existingInterview.interviewerId;

    if (!session.user.isAdmin && !isAssignedInterviewer) {
      await createAuditLog({
        applicationId: application.id,
        personId: application.personId,
        userId: typeof session.user.dbUserId === 'string' ? session.user.dbUserId : undefined,
        action: 'Unauthorised attempt to complete interview',
        actionType: 'UPDATE',
        details: { reason: 'Not assigned interviewer or admin' },
      });
      return NextResponse.json(
        { error: 'Forbidden - Only the assigned interviewer or an admin can complete this interview' },
        { status: 403 }
      );
    }

    // Parse request body
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.error;
    const body = parsed.body;

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

    // Sanitize notes
    const sanitizedNotes = sanitizeText(notes.trim(), recruitment.characterLimits.interviewNotes);
    if (!sanitizedNotes) {
      return NextResponse.json(
        { error: 'Interview notes are required' },
        { status: 400 }
      );
    }

    let recordingUrl: string | null = null;
    if (body.recordingUrl !== undefined) {
      if (body.recordingUrl !== null && typeof body.recordingUrl !== 'string') {
        return NextResponse.json(
          { error: 'Recording URL must be a string' },
          { status: 400 }
        );
      }

      const trimmedRecordingUrl = typeof body.recordingUrl === 'string' ? body.recordingUrl.trim() : '';
      if (trimmedRecordingUrl) {
        if (trimmedRecordingUrl.length > recruitment.characterLimits.recordingUrl) {
          return NextResponse.json(
            { error: `Recording URL cannot exceed ${recruitment.characterLimits.recordingUrl} characters` },
            { status: 400 }
          );
        }

        if (!isValidHttpsURL(trimmedRecordingUrl)) {
          return NextResponse.json(
            { error: 'Recording URL must be a valid HTTPS URL' },
            { status: 400 }
          );
        }

        recordingUrl = trimmedRecordingUrl;
      }
    }

    const updateData: {
      completedAt: Date;
      notes: string;
      updatedAt: Date;
      recordingUrl?: string | null;
    } = {
      completedAt: new Date(),
      notes: sanitizedNotes,
      updatedAt: new Date(),
    };

    if (body.recordingUrl !== undefined) {
      updateData.recordingUrl = recordingUrl;
    }

    // Update interview record
    const completedInterview = await db.interview.update({
      where: { id: existingInterview.id },
      data: updateData,
    });

    const recordingDetails = recordingUrl
      ? {
          hasRecordingUrl: true,
          recordingHostname: new URL(recordingUrl).hostname,
        }
      : { hasRecordingUrl: false };

    // Log the interview completion
    await logInterviewCompleted(
      application.id,
      application.personId,
      existingInterview.interviewerId,
      session.user.dbUserId,
      recordingDetails
    );

    console.log('[Complete Interview] Success:', {
      applicationId: sanitizeForLog(application.id),
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
        recordingUrl: completedInterview.recordingUrl,
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
