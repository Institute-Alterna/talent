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
import { requireApplicationAccess, parseJsonBody, type RouteParams } from '@/lib/api-helpers';
import {
  sendGCInvitation,
  sendSCInvitation,
  sendSCInvitations,
  sendInterviewInvitation,
  sendRejection,
  EMAIL_TEMPLATES,
  type EmailTemplateName,
} from '@/lib/email';
import { escapeHtml } from '@/lib/email/templates';
import { sanitizeForLog } from '@/lib/security';
import { isValidURL, isValidUUID } from '@/lib/utils';
import { db } from '@/lib/db';

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
    const access = await requireApplicationAccess(params);
    if (!access.ok) return access.error;
    const { application } = access;

    // Check if application is active (can't send emails to rejected applications)
    if (application.status !== 'ACTIVE' && application.status !== 'ACCEPTED') {
      return NextResponse.json(
        { error: 'Cannot send emails to inactive applications' },
        { status: 400 }
      );
    }

    // Parse request body
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.error;
    const body = parsed.body;

    // Validate template name
    const templateName = body.templateName as string;
    if (!templateName || !ALLOWED_TEMPLATES.includes(templateName as EmailTemplateName)) {
      return NextResponse.json(
        { error: `Invalid template. Must be one of: ${ALLOWED_TEMPLATES.join(', ')}` },
        { status: 400 }
      );
    }

    // Stage-gate email templates to prevent inappropriate emails
    const postInterviewStages = ['AGREEMENT', 'SIGNED'];
    if (templateName === EMAIL_TEMPLATES.GC_INVITATION ||
        templateName === EMAIL_TEMPLATES.SC_INVITATION ||
        templateName === EMAIL_TEMPLATES.INTERVIEW_INVITATION) {
      if (postInterviewStages.includes(application.currentStage)) {
        return NextResponse.json(
          { error: `Cannot send ${templateName} email at the ${application.currentStage} stage` },
          { status: 400 }
        );
      }
    }

    // Rejection emails should not be sent to accepted applications
    if (templateName === EMAIL_TEMPLATES.REJECTION && application.status === 'ACCEPTED') {
      return NextResponse.json(
        { error: 'Cannot send a rejection email to an accepted application' },
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
        // Send specialized competencies invitation(s)
        // Accepts competencyIds array for new multi-SC flow,
        // or falls back to assessmentFormUrl for backward compatibility
        const competencyIds = body.competencyIds as string[] | undefined;

        if (Array.isArray(competencyIds) && competencyIds.length > 0) {
          // New multi-SC flow
          if (competencyIds.length > 3) {
            return NextResponse.json(
              { error: 'Maximum of 3 competencies can be sent at once' },
              { status: 400 }
            );
          }

          // Validate all IDs are valid UUIDs
          for (const id of competencyIds) {
            if (typeof id !== 'string' || !isValidUUID(id)) {
              return NextResponse.json(
                { error: `Invalid competency ID: ${id}` },
                { status: 400 }
              );
            }
          }

          // Look up competencies
          const { getCompetenciesByIds } = await import('@/lib/services/competencies');
          const competencies = await getCompetenciesByIds(competencyIds);

          if (competencies.length !== competencyIds.length) {
            return NextResponse.json(
              { error: 'One or more competencies not found or inactive' },
              { status: 400 }
            );
          }

          // Check for already-assigned SCs on this application (avoid duplicates)
          const existingAssessments = await db.assessment.findMany({
            where: {
              applicationId,
              assessmentType: 'SPECIALIZED_COMPETENCIES',
              specialisedCompetencyId: { in: competencyIds },
            },
            select: { specialisedCompetencyId: true },
          });

          const alreadyAssigned = new Set(existingAssessments.map(a => a.specialisedCompetencyId));
          const duplicates = competencyIds.filter(id => alreadyAssigned.has(id));

          if (duplicates.length > 0) {
            return NextResponse.json(
              { error: 'One or more competencies have already been assigned to this application' },
              { status: 400 }
            );
          }

          // Create pending Assessment records
          await db.assessment.createMany({
            data: competencyIds.map(scId => ({
              applicationId,
              assessmentType: 'SPECIALIZED_COMPETENCIES' as const,
              specialisedCompetencyId: scId,
            })),
          });

          // Send the email with all SC links
          result = await sendSCInvitations(
            personId,
            applicationId,
            recipientEmail,
            firstName,
            position,
            competencies.map(sc => ({ id: sc.id, name: sc.name, tallyFormUrl: sc.tallyFormUrl }))
          );
        } else {
          // Legacy single-SC flow (backward compatibility)
          const assessmentFormUrl = body.assessmentFormUrl as string;

          if (!assessmentFormUrl) {
            return NextResponse.json(
              { error: 'competencyIds array or assessmentFormUrl is required for SC invitation' },
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
        }
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
