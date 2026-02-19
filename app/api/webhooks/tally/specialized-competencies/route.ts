/**
 * Tally Specialized Competencies Assessment Webhook Handler
 *
 * POST /api/webhooks/tally/specialized-competencies
 *
 * Receives specialized competencies assessment results from Tally forms.
 * Updates Application records and advances to INTERVIEW stage or rejects.
 *
 * Flow:
 * 1. Verify webhook signature and IP
 * 2. Check rate limits
 * 3. Check idempotency (tallySubmissionId)
 * 4. Extract assessment data (applicationId, score)
 * 5. Verify application exists and is in correct stage
 * 6. Create Assessment record
 * 7. Advance to INTERVIEW or reject based on score
 * 8. Log to audit trail
 * 9. Return success
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
import {
  getApplicationById,
  advanceApplicationStage,
  updateApplicationStatus,
} from '@/lib/services/applications';
import {
  logWebhookReceived,
  logAssessmentCompleted,
  logStageChange,
  logStatusChange,
} from '@/lib/audit';
import { recruitment } from '@/config/recruitment';
import { sanitizeForLog } from '@/lib/security';

/**
 * POST /api/webhooks/tally/specialized-competencies
 *
 * Handle specialised competencies assessment completion from Tally
 */
export async function POST(request: NextRequest) {
  // Verify, parse, and validate webhook request
  const parsed = await parseAndVerifyWebhook(request, '[Webhook SC]');
  if (!parsed.ok) return parsed.error;
  const { payload, ip, rateLimitHeaders } = parsed;

  const { submissionId, formId, formName } = payload.data;

  // Check for duplicate submission (idempotency)
  const existingAssessment = await db.assessment.findUnique({
    where: { tallySubmissionId: submissionId },
  });

  if (existingAssessment) {
    console.log(`[Webhook SC] Duplicate submission ignored: ${sanitizeForLog(submissionId)}`);
    return NextResponse.json(
      {
        success: true,
        message: 'Duplicate submission - already processed',
        assessmentId: existingAssessment.id,
      },
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

  const { applicationId, score, rawData, tallySubmissionId } = assessmentData;

  // Log webhook receipt
  await logWebhookReceived(
    'specialized-competencies',
    undefined,
    applicationId,
    {
      submissionId,
      formId,
      formName,
      score,
    },
    ip
  );

  // Verify application exists
  const application = await getApplicationById(applicationId);
  if (!application) {
    console.error(`[Webhook SC] Application not found: ${sanitizeForLog(applicationId)}`);
    return webhookErrorResponse('Application not found', 404, rateLimitHeaders);
  }

  // Verify application is in correct stage
  if (
    application.currentStage !== 'SPECIALIZED_COMPETENCIES' &&
    application.currentStage !== 'GENERAL_COMPETENCIES'
  ) {
    console.error(
      `[Webhook SC] Application ${sanitizeForLog(applicationId)} is in ${sanitizeForLog(application.currentStage)} stage, expected SPECIALIZED_COMPETENCIES`
    );
    return webhookErrorResponse(
      `Application is not in the correct stage for specialised assessment`,
      400,
      rateLimitHeaders
    );
  }

  // Verify application is still active
  if (application.status !== 'ACTIVE') {
    console.error(`[Webhook SC] Application ${sanitizeForLog(applicationId)} is ${sanitizeForLog(application.status)}, not ACTIVE`);
    return webhookErrorResponse('Application is not active', 400, rateLimitHeaders);
  }

  // Determine pass/fail
  const { threshold, scale } = recruitment.assessmentThresholds.specializedCompetencies;
  const passed = score >= threshold;

  // Create Assessment record
  const assessment = await db.assessment.create({
    data: {
      applicationId,
      assessmentType: 'SPECIALIZED_COMPETENCIES',
      score,
      passed,
      threshold,
      completedAt: new Date(),
      rawData: rawData as Prisma.InputJsonValue,
      tallySubmissionId,
    },
  });

  await logAssessmentCompleted(
    application.personId,
    applicationId,
    'Specialised Competencies',
    score,
    passed
  );

  let newStage: string = application.currentStage;
  let newStatus: string = application.status;

  if (passed) {
    // Advance to INTERVIEW stage
    await advanceApplicationStage(applicationId, 'INTERVIEW');
    newStage = 'INTERVIEW';

    await logStageChange(
      applicationId,
      application.personId,
      application.currentStage,
      'INTERVIEW',
      undefined,
      `Specialized competencies passed with score ${score}/${scale} (threshold: ${threshold})`
    );

    // TODO: In Phase 6c, send interview scheduling email
    // await sendEmail(person.email, 'specialized-competencies-passed', { position: application.position });
  } else {
    // Reject application
    await updateApplicationStatus(applicationId, 'REJECTED');
    newStatus = 'REJECTED';

    await logStatusChange(
      applicationId,
      application.personId,
      'ACTIVE',
      'REJECTED',
      undefined,
      `Specialized competencies failed with score ${score}/${scale} (threshold: ${threshold})`
    );

    // TODO: In Phase 6c, send rejection email
    // await sendEmail(person.email, 'specialized-competencies-failed', { position: application.position });
  }

  console.log(
    `[Webhook SC] Assessment processed: Application ${sanitizeForLog(applicationId)}, Score: ${sanitizeForLog(score)}/${scale} (threshold: ${threshold}), ` +
      `Passed: ${passed}, New stage: ${newStage}, New status: ${newStatus}`
  );

  return NextResponse.json(
    {
      success: true,
      message: passed
        ? 'Specialised competencies passed - application advanced to interview stage'
        : 'Specialised competencies not passed - application rejected',
      data: {
        assessmentId: assessment.id,
        applicationId,
        position: application.position,
        score,
        threshold,
        passed,
        currentStage: newStage,
        status: newStatus,
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
