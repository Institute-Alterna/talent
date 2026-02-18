/**
 * Send Email API Route
 *
 * POST /api/applications/[id]/send-email
 *
 * Send an email to the applicant for this application.
 * Supports various email templates for different stages.
 *
 * Body:
 * - templateName: Name of the email template to use
 * - additionalData: Optional additional data for template variables
 *
 * Required: Authenticated user with app access
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAccess } from '@/lib/api-helpers';
import { getApplicationDetail } from '@/lib/services/applications';
import {
  sendGCInvitation,
  sendSCInvitation,
  sendInterviewInvitation,
  sendRejection,
  EMAIL_TEMPLATES,
  type EmailTemplateName,
} from '@/lib/email';
import { escapeHtml } from '@/lib/email/templates';
import { sanitizeForLog } from '@/lib/security';
import { isValidUUID, isValidURL } from '@/lib/utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Valid template names that can be sent via this endpoint
 */
const ALLOWED_TEMPLATES: EmailTemplateName[] = [
  EMAIL_TEMPLATES.GC_INVITATION,
  EMAIL_TEMPLATES.SC_INVITATION,
  EMAIL_TEMPLATES.INTERVIEW_INVITATION,
  EMAIL_TEMPLATES.REJECTION,
];

/**
 * POST /api/applications/[id]/send-email
 *
 * Send an email to the applicant.
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

    const auth = await requireAccess();
    if (!auth.ok) return auth.error;

    // Get application details
    const application = await getApplicationDetail(id);
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Check if application is active (can't send emails to withdrawn/rejected)
    if (application.status !== 'ACTIVE' && application.status !== 'ACCEPTED') {
      return NextResponse.json(
        { error: 'Cannot send emails to inactive applications' },
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

    // Validate template name
    const templateName = body.templateName as string;
    if (!templateName || !ALLOWED_TEMPLATES.includes(templateName as EmailTemplateName)) {
      return NextResponse.json(
        { error: `Invalid template. Must be one of: ${ALLOWED_TEMPLATES.join(', ')}` },
        { status: 400 }
      );
    }

    const person = application.person;
    const personId = person.id;
    const applicationId = application.id;
    const recipientEmail = person.email;
    const firstName = person.firstName;
    const position = application.position;

    let result;

    // Send appropriate email based on template
    switch (templateName) {
      case EMAIL_TEMPLATES.GC_INVITATION: {
        // Send general competencies invitation
        if (person.generalCompetenciesCompleted) {
          return NextResponse.json(
            { error: 'Person has already completed general competencies assessment' },
            { status: 400 }
          );
        }

        result = await sendGCInvitation(
          personId,
          applicationId,
          recipientEmail,
          firstName,
          position
        );
        break;
      }

      case EMAIL_TEMPLATES.SC_INVITATION: {
        // Send specialized competencies invitation
        // Requires additional assessmentFormUrl
        const assessmentFormUrl = body.assessmentFormUrl as string;

        if (!assessmentFormUrl) {
          return NextResponse.json(
            { error: 'assessmentFormUrl is required for specialized competencies invitation' },
            { status: 400 }
          );
        }

        if (!isValidURL(assessmentFormUrl)) {
          return NextResponse.json(
            { error: 'Invalid assessmentFormUrl format' },
            { status: 400 }
          );
        }

        result = await sendSCInvitation(
          personId,
          applicationId,
          recipientEmail,
          firstName,
          position,
          assessmentFormUrl
        );
        break;
      }

      case EMAIL_TEMPLATES.INTERVIEW_INVITATION: {
        // Send interview invitation
        // Requires interviewer info
        const interviewerName = body.interviewerName as string;
        const schedulingLink = body.schedulingLink as string;

        if (!interviewerName || typeof interviewerName !== 'string') {
          return NextResponse.json(
            { error: 'interviewerName is required for interview invitation' },
            { status: 400 }
          );
        }

        if (!schedulingLink) {
          return NextResponse.json(
            { error: 'schedulingLink is required for interview invitation' },
            { status: 400 }
          );
        }

        if (!isValidURL(schedulingLink)) {
          return NextResponse.json(
            { error: 'Invalid schedulingLink format' },
            { status: 400 }
          );
        }

        result = await sendInterviewInvitation(
          personId,
          applicationId,
          recipientEmail,
          firstName,
          position,
          escapeHtml(interviewerName.substring(0, 100)),
          schedulingLink
        );
        break;
      }

      case EMAIL_TEMPLATES.REJECTION: {
        // Send rejection email
        const reason = body.reason as string | undefined;

        result = await sendRejection(
          personId,
          applicationId,
          recipientEmail,
          firstName,
          position,
          reason ? escapeHtml(reason.substring(0, 500)) : undefined
        );
        break;
      }

      default:
        return NextResponse.json(
          { error: 'Unsupported template' },
          { status: 400 }
        );
    }

    // Check result
    if (!result.success && !result.queued) {
      return NextResponse.json(
        { error: result.error || 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.queued
        ? 'Email queued for delivery (rate limit reached)'
        : 'Email sent successfully',
      emailLogId: result.emailLogId,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error('Error sending email:', sanitizeForLog(error instanceof Error ? error.message : 'Unknown error'));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
