/**
 * Tally Specialized Competencies Assessment Webhook Handler
 *
 * POST /api/webhooks/tally/specialized-competencies
 *
 * Receives specialized competencies assessment submissions from Tally forms.
 * Records the submission and awaits admin review (does NOT auto-advance or auto-reject).
 *
 * Flow:
 * 1. Verify webhook signature and IP
 * 2. Check rate limits
 * 3. Check idempotency (tallySubmissionId)
 * 4. Extract assessment data (applicationId, scId, file URLs)
 * 5. Verify application exists and is active
 * 6. Match to existing pending assessment or create new one
 * 7. Log to audit trail
 * 8. Return success
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  extractSCAssessmentData,
  parseAndVerifyWebhook,
  webhookErrorResponse,
  webhookOptionsResponse,
} from '@/lib/webhooks';
import { db } from '@/lib/db';
import { Prisma } from '@/lib/generated/prisma/client';
import { getApplicationById } from '@/lib/services/applications';
import {
  logWebhookReceived,
  logAssessmentCompleted,
} from '@/lib/audit';
import { sanitizeForLog } from '@/lib/security';

/**
 * POST /api/webhooks/tally/specialized-competencies
 *
 * Handle specialised competencies assessment submission from Tally
 */
export async function POST(request: NextRequest) {
  const parsed = await parseAndVerifyWebhook(request, '[Webhook SC]');
  if (!parsed.ok) return parsed.error;
  const { payload, ip, rateLimitHeaders } = parsed;

  const { submissionId, formId, formName } = payload.data;

  // Check for duplicate submission (idempotency)
  const existingBySubmission = await db.assessment.findUnique({
    where: { tallySubmissionId: submissionId },
  });

  if (existingBySubmission) {
    console.log(`[Webhook SC] Duplicate submission ignored: ${sanitizeForLog(submissionId)}`);
    return NextResponse.json(
      { success: true, message: 'Duplicate submission - already processed', assessmentId: existingBySubmission.id },
      { headers: rateLimitHeaders }
    );
  }

  // Extract assessment data
  let assessmentData;
  try {
    assessmentData = extractSCAssessmentData(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to extract assessment data';
    console.error('[Webhook SC] Extraction error:', message);
    return webhookErrorResponse(message, 400, rateLimitHeaders);
  }

  let { applicationId } = assessmentData;
  const { specialisedCompetencyId, submissionUrls, rawData, tallySubmissionId } = assessmentData;

  // ---------------------------------------------------------------------------
  // Resolve applicationId via respondentId when the form omits the hidden field
  // ---------------------------------------------------------------------------
  if (!applicationId) {
    const { respondentId } = payload.data;
    console.log(`[Webhook SC] applicationId missing — resolving via respondentId ${sanitizeForLog(respondentId)}`);

    const person = await db.person.findFirst({
      where: { tallyRespondentId: respondentId },
      include: {
        applications: {
          where: { status: 'ACTIVE' },
          include: {
            assessments: {
              where: {
                assessmentType: 'SPECIALIZED_COMPETENCIES',
                completedAt: null,
              },
            },
          },
        },
      },
    });

    if (!person) {
      console.error(`[Webhook SC] No person found for respondentId: ${sanitizeForLog(respondentId)}`);
      return webhookErrorResponse(
        'Candidate not found — no person matched this respondent ID',
        404,
        rateLimitHeaders
      );
    }

    const pendingByApp = person.applications.flatMap((app) =>
      app.assessments.map((a) => ({ assessmentId: a.id, applicationId: app.id, createdAt: a.createdAt }))
    );

    if (pendingByApp.length === 0) {
      console.error(`[Webhook SC] No pending SC assessments for respondentId: ${sanitizeForLog(respondentId)}`);
      return webhookErrorResponse(
        'No pending specialised competency assessment found for this candidate',
        404,
        rateLimitHeaders
      );
    }

    if (pendingByApp.length > 1) {
      // Ambiguous — use the most recently created pending assessment
      pendingByApp.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      console.warn(
        `[Webhook SC] Multiple pending SC assessments for respondentId ${sanitizeForLog(respondentId)} — using most recent`
      );
    }

    applicationId = pendingByApp[0].applicationId;
    console.log(`[Webhook SC] Resolved applicationId: ${sanitizeForLog(applicationId)} via respondentId`);
  }

  // Verify application exists
  const application = await getApplicationById(applicationId);
  if (!application) {
    console.error(`[Webhook SC] Application not found: ${sanitizeForLog(applicationId)}`);
    return webhookErrorResponse('Application not found', 404, rateLimitHeaders);
  }

  // Log webhook receipt (after application lookup for person context)
  await logWebhookReceived(
    'specialized-competencies',
    application.personId,
    applicationId,
    {
      submissionId,
      formId,
      formName,
      eventId: payload.eventId,
      specialisedCompetencyId,
      position: application.position,
    },
    ip
  );

  // Verify application is active
  if (application.status !== 'ACTIVE') {
    console.error(`[Webhook SC] Application ${sanitizeForLog(applicationId)} is ${sanitizeForLog(application.status)}, not ACTIVE`);
    return webhookErrorResponse('Application is not active', 400, rateLimitHeaders);
  }

  // Try to find a pending assessment (created when invitation was sent)
  let assessment;
  if (specialisedCompetencyId) {
    const pendingAssessment = await db.assessment.findFirst({
      where: {
        applicationId,
        specialisedCompetencyId,
        assessmentType: 'SPECIALIZED_COMPETENCIES',
        completedAt: null,
      },
    });

    if (pendingAssessment) {
      // Update existing pending assessment with submission data
      assessment = await db.assessment.update({
        where: { id: pendingAssessment.id },
        data: {
          completedAt: new Date(),
          rawData: rawData as Prisma.InputJsonValue,
          submissionUrls: submissionUrls as unknown as Prisma.InputJsonValue,
          tallySubmissionId,
        },
      });
    } else {
      // Check for a completed-but-unreviewed assessment (re-submission before review)
      const unreviewedAssessment = await db.assessment.findFirst({
        where: {
          applicationId,
          specialisedCompetencyId,
          assessmentType: 'SPECIALIZED_COMPETENCIES',
          completedAt: { not: null },
          passed: null,
        },
      });

      if (unreviewedAssessment) {
        // Update the existing unreviewed assessment with new submission data
        assessment = await db.assessment.update({
          where: { id: unreviewedAssessment.id },
          data: {
            completedAt: new Date(),
            rawData: rawData as Prisma.InputJsonValue,
            submissionUrls: submissionUrls as unknown as Prisma.InputJsonValue,
            tallySubmissionId,
          },
        });
        console.log(
          `[Webhook SC] Re-submission updated existing unreviewed assessment: ${assessment.id}`
        );
      }
    }
  }

  // If no pending/unreviewed assessment found, create a new one
  if (!assessment) {
    assessment = await db.assessment.create({
      data: {
        applicationId,
        assessmentType: 'SPECIALIZED_COMPETENCIES',
        specialisedCompetencyId: specialisedCompetencyId || null,
        completedAt: new Date(),
        rawData: rawData as Prisma.InputJsonValue,
        submissionUrls: submissionUrls as unknown as Prisma.InputJsonValue,
        tallySubmissionId,
      },
    });
  }

  await logAssessmentCompleted(
    application.personId,
    applicationId,
    'Specialised Competency submission received',
    null,
    null // passed is null — awaiting admin review
  );

  console.log(
    `[Webhook SC] Submission recorded: Application ${sanitizeForLog(applicationId)}, ` +
    `SC: ${sanitizeForLog(specialisedCompetencyId || 'unknown')}, Assessment: ${assessment.id}`
  );

  return NextResponse.json(
    {
      success: true,
      message: 'Specialised competency submission recorded — awaiting admin review',
      data: {
        assessmentId: assessment.id,
        applicationId,
        specialisedCompetencyId,
      },
    },
    { headers: rateLimitHeaders }
  );
}

/**
 * Handle OPTIONS requests (CORS preflight)
 */
export async function OPTIONS() {
  return webhookOptionsResponse();
}
