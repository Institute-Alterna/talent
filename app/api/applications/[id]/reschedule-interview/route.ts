/**
 * Reschedule Interview API Route
 *
 * POST /api/applications/[id]/reschedule-interview
 *
 * Update an existing interview record with a new interviewer and optionally resend invitation email.
 *
 * Body:
 * - interviewerId: ID of the user who will conduct the interview
 * - resendEmail: Whether to resend interview invitation email (default: true)
 *
 * Required: Authenticated user with app access
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getApplicationDetail } from '@/lib/services/applications';
import { getUserById } from '@/lib/services/users';
import { sendInterviewInvitation } from '@/lib/email';
import { logInterviewRescheduled } from '@/lib/audit';
import { db } from '@/lib/db';
import { sanitizeForLog, requireString, RequiredFieldError } from '@/lib/security';
import { isValidUUID, isValidURL } from '@/lib/utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/applications/[id]/reschedule-interview
 *
 * Reschedule an existing interview with a new interviewer.
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
      console.error('[Reschedule Interview] Invalid UUID format:', sanitizeForLog(id));
      return NextResponse.json(
        { error: 'Invalid application ID format' },
        { status: 400 }
      );
    }

    // Check authentication
    const session = await auth();
    if (!session?.user) {
      console.error('[Reschedule Interview] Unauthorized access attempt for application:', sanitizeForLog(id));
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check app access permission
    if (!session.user.hasAccess) {
      console.error('[Reschedule Interview] Access denied for user:', sanitizeForLog(session.user.email));
      return NextResponse.json(
        { error: 'Forbidden - App access required' },
        { status: 403 }
      );
    }

    // Get application details
    const application = await getApplicationDetail(id);
    if (!application) {
      console.error('[Reschedule Interview] Application not found:', sanitizeForLog(id));
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Validate application is active
    if (application.status !== 'ACTIVE') {
      console.error('[Reschedule Interview] Application not active:', sanitizeForLog(id), 'status:', sanitizeForLog(application.status));
      return NextResponse.json(
        { error: 'Can only reschedule interviews for active applications' },
        { status: 400 }
      );
    }

    // Get existing interview
    const existingInterview = await db.interview.findFirst({
      where: {
        applicationId: id,
        completedAt: null, // Only reschedule non-completed interviews
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!existingInterview) {
      console.error('[Reschedule Interview] No active interview found for application:', sanitizeForLog(id));
      return NextResponse.json(
        { error: 'No active interview found to reschedule' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { resendEmail = true } = body;

    // Validate required fields — requireString prevents non-string truthy bypass
    let interviewerId: string;
    try {
      interviewerId = requireString(body.interviewerId, 'interviewerId');
    } catch (e) {
      if (e instanceof RequiredFieldError) {
        return NextResponse.json({ error: 'Interviewer ID is required' }, { status: 400 });
      }
      throw e;
    }

    if (!isValidUUID(interviewerId)) {
      console.error('[Reschedule Interview] Invalid interviewer UUID:', sanitizeForLog(interviewerId));
      return NextResponse.json(
        { error: 'Invalid interviewer ID format' },
        { status: 400 }
      );
    }

    // Get interviewer details
    const interviewer = await getUserById(interviewerId);
    if (!interviewer) {
      console.error('[Reschedule Interview] Interviewer not found:', sanitizeForLog(interviewerId));
      return NextResponse.json(
        { error: 'Interviewer not found' },
        { status: 404 }
      );
    }

    // Validate interviewer has scheduling link
    if (!interviewer.schedulingLink) {
      console.error('[Reschedule Interview] Interviewer has no scheduling link:', sanitizeForLog(interviewerId));
      return NextResponse.json(
        { error: 'Selected interviewer does not have a scheduling link configured' },
        { status: 400 }
      );
    }

    // Validate scheduling link URL
    if (!isValidURL(interviewer.schedulingLink)) {
      console.error('[Reschedule Interview] Invalid scheduling link URL:', sanitizeForLog(interviewer.schedulingLink));
      return NextResponse.json(
        { error: 'Interviewer has an invalid scheduling link' },
        { status: 400 }
      );
    }

    // Update interview record
    const updatedInterview = await db.interview.update({
      where: { id: existingInterview.id },
      data: {
        interviewerId,
        schedulingLink: interviewer.schedulingLink,
        emailSentAt: resendEmail ? new Date() : existingInterview.emailSentAt,
        updatedAt: new Date(),
      },
    });

    // Log the interview rescheduling
    await logInterviewRescheduled(
      id,
      application.personId,
      existingInterview.interviewerId,
      interviewerId,
      resendEmail,
      session.user.dbUserId
    );

    // Send interview invitation email if requested
    let emailResult = null;
    if (resendEmail) {
      emailResult = await sendInterviewInvitation(
        application.personId,
        id,
        application.person.email,
        application.person.firstName,
        application.position,
        interviewer.displayName,
        interviewer.schedulingLink
      );

      if (!emailResult.success) {
        console.error('[Reschedule Interview] Email send failed:', emailResult.error);
        // Don't fail the request if email fails, but log it
      }
    }

    console.log('[Reschedule Interview] Success:', {
      applicationId: sanitizeForLog(id),
      oldInterviewerId: sanitizeForLog(existingInterview.interviewerId),
      newInterviewerId: sanitizeForLog(interviewerId),
      emailResent: resendEmail,
    });

    return NextResponse.json({
      success: true,
      message: resendEmail
        ? 'Interview rescheduled and invitation email sent'
        : 'Interview rescheduled',
      interview: {
        id: updatedInterview.id,
        interviewerId: updatedInterview.interviewerId,
        schedulingLink: updatedInterview.schedulingLink,
        emailSentAt: updatedInterview.emailSentAt,
      },
      emailSent: resendEmail && emailResult?.success,
    });
  } catch (error) {
    console.error('[Reschedule Interview] Error:', sanitizeForLog(error instanceof Error ? error.message : 'Unknown error'));
    return NextResponse.json(
      {
        error: 'Failed to reschedule interview',
        details: error instanceof Error ? sanitizeForLog(error.message) : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
