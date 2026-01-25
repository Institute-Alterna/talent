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
import { auth } from '@/lib/auth';
import { getApplicationDetail } from '@/lib/services/applications';
import { getUserById } from '@/lib/services/users';
import { sendInterviewInvitation } from '@/lib/email';
import { logInterviewScheduled } from '@/lib/audit';
import { db } from '@/lib/db';
import { sanitizeForLog } from '@/lib/security';
import { escapeHtml } from '@/lib/email/templates';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Validate UUID format to prevent injection
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Sanitize text content
 */
function sanitizeText(text: string | null | undefined, maxLength: number = 5000): string | null {
  if (text === null || text === undefined) return null;
  return text.replace(/\0/g, '').substring(0, maxLength);
}

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
    const { id } = await params;

    // Validate ID format
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid application ID format' },
        { status: 400 }
      );
    }

    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check app access permission
    if (!session.user.hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden - App access required' },
        { status: 403 }
      );
    }

    // Get application details
    const application = await getApplicationDetail(id);
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Check if application is active
    if (application.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Cannot schedule interview for inactive applications' },
        { status: 400 }
      );
    }

    // Parse request body
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Validate interviewerId
    const interviewerId = body.interviewerId as string;
    if (!interviewerId) {
      return NextResponse.json(
        { error: 'interviewerId is required' },
        { status: 400 }
      );
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
    if (!isValidUrl(interviewer.schedulingLink)) {
      return NextResponse.json(
        { error: 'Interviewer has an invalid scheduling link configured' },
        { status: 400 }
      );
    }

    // Optional notes
    const notes = sanitizeText(body.notes as string | undefined, 2000);

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
        where: { id },
        data: { currentStage: 'INTERVIEW' },
      });
      stageChanged = true;
    }

    // Create interview record
    const interview = await db.interview.create({
      data: {
        applicationId: id,
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
      id,
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
        id,
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
