/**
 * Schedule Interview API Route
 *
 * POST /api/applications/[id]/schedule-interview
 *
 * Create an interview record and optionally send invitation email.
 *
 * Body:
 * - interviewerId: ID of the user who will conduct the interview
 * - notes: Optional notes for the interview
 * - sendEmail: Whether to send interview invitation email (default: true)
 *
 * Required: Authenticated user with app access
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApplicationAccess, parseJsonBody, type RouteParams } from '@/lib/api-helpers';
import { getUserById } from '@/lib/services/users';
import { sendInterviewInvitation } from '@/lib/email';
import { logInterviewScheduled } from '@/lib/audit';
import { db } from '@/lib/db';
import { sanitizeForLog, requireString, RequiredFieldError, sanitizeText } from '@/lib/security';
import { isValidUUID, isValidURL } from '@/lib/utils';

/**
 * POST /api/applications/[id]/schedule-interview
 *
 * Create an interview record for the application.
 * Requires authenticated user (hiring manager or admin).
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const access = await requireApplicationAccess(params, { requireActive: true });
    if (!access.ok) return access.error;
    const { session, application } = access;

    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.error;
    const { body } = parsed;

    // Validate interviewerId
    let interviewerId: string;
    try {
      interviewerId = requireString(body.interviewerId, 'interviewerId');
    } catch (e) {
      if (e instanceof RequiredFieldError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      throw e;
    }

    if (!isValidUUID(interviewerId)) {
      return NextResponse.json(
        { error: 'Invalid interviewerId format' },
        { status: 400 }
      );
    }

    // Get interviewer
    const interviewer = await getUserById(interviewerId);
    if (!interviewer) {
      return NextResponse.json(
        { error: 'Interviewer not found' },
        { status: 404 }
      );
    }

    // Check if interviewer has a scheduling link
    if (!interviewer.schedulingLink) {
      return NextResponse.json(
        { error: 'Interviewer has not configured their scheduling link. Please update their profile first.' },
        { status: 400 }
      );
    }

    // Validate scheduling link
    if (!isValidURL(interviewer.schedulingLink)) {
      return NextResponse.json(
        { error: 'Interviewer has an invalid scheduling link configured' },
        { status: 400 }
      );
    }

    // Optional notes
    const notes = typeof body.notes === 'string' ? sanitizeText(body.notes, 2000) : null;

    // Whether to send email (default: true)
    const sendEmail = body.sendEmail !== false;

    // Optional scheduled time
    let scheduledAt: Date | undefined;
    if (body.scheduledAt) {
      const parsedDate = new Date(body.scheduledAt as string);
      if (Number.isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid scheduledAt date format' },
          { status: 400 }
        );
      }
      // Ensure date is in the future
      if (parsedDate <= new Date()) {
        return NextResponse.json(
          { error: 'scheduledAt must be in the future' },
          { status: 400 }
        );
      }
      scheduledAt = parsedDate;
    }

    // Advance application to INTERVIEW stage if not already there
    let stageChanged = false;
    if (application.currentStage !== 'INTERVIEW') {
      await db.application.update({
        where: { id: application.id },
        data: { currentStage: 'INTERVIEW' },
      });
      stageChanged = true;
    }

    // Create interview record
    const interview = await db.interview.create({
      data: {
        applicationId: application.id,
        interviewerId: interviewer.id,
        schedulingLink: interviewer.schedulingLink,
        scheduledAt: scheduledAt ?? null,
        notes,
        outcome: 'PENDING',
        emailSentAt: sendEmail ? new Date() : null,
      },
    });

    // Log the interview scheduling
    await logInterviewScheduled(
      application.id,
      application.personId,
      interviewer.id,
      interviewer.schedulingLink,
      session.user.dbUserId
    );

    // Send interview invitation email if requested
    let emailResult = null;
    if (sendEmail) {
      emailResult = await sendInterviewInvitation(
        application.personId,
        application.id,
        application.person.email,
        application.person.firstName,
        application.position,
        interviewer.displayName,
        interviewer.schedulingLink
      );
    }

    return NextResponse.json({
      success: true,
      message: sendEmail
        ? 'Interview scheduled and invitation sent'
        : 'Interview scheduled (no email sent)',
      interview: {
        id: interview.id,
        interviewerId: interview.interviewerId,
        interviewerName: interviewer.displayName,
        schedulingLink: interview.schedulingLink,
        scheduledAt: interview.scheduledAt,
        notes: interview.notes,
        outcome: interview.outcome,
      },
      stageChanged,
      emailSent: sendEmail,
      emailResult: emailResult ? {
        success: emailResult.success,
        queued: emailResult.queued,
        emailLogId: emailResult.emailLogId,
      } : null,
    });
  } catch (error) {
    console.error('Error scheduling interview:', sanitizeForLog(error instanceof Error ? error.message : 'Unknown error'));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
