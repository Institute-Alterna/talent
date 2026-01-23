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
  verifyWebhook,
  getClientIP,
  webhookRateLimiter,
  getRateLimitHeaders,
  extractSCAssessmentData,
  type TallyWebhookPayload,
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
 * Webhook error response
 */
function errorResponse(message: string, status: number, headers?: Record<string, string>) {
  return NextResponse.json({ error: message }, { status, headers });
}

/**
 * POST /api/webhooks/tally/specialized-competencies
 *
 * Handle specialized competencies assessment completion from Tally
 */
export async function POST(request: NextRequest) {
  const ip = getClientIP(request.headers);

  // Check rate limit
  const rateLimitResult = webhookRateLimiter(ip || 'unknown');
  const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);

  if (!rateLimitResult.allowed) {
    return errorResponse('Rate limit exceeded', 429, rateLimitHeaders);
  }

  // Read raw body for signature verification
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return errorResponse('Failed to read request body', 400, rateLimitHeaders);
  }

  // Verify webhook signature and IP
  const verification = verifyWebhook(rawBody, request.headers);
  if (!verification.valid) {
    console.error('[Webhook SC] Verification failed:', verification.error);
    return errorResponse(verification.error || 'Verification failed', 401, rateLimitHeaders);
  }

  // Parse JSON payload
  let payload: TallyWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return errorResponse('Invalid JSON payload', 400, rateLimitHeaders);
  }

  // Validate payload structure
  if (!payload.data?.submissionId || !payload.data?.fields) {
    return errorResponse('Invalid payload structure', 400, rateLimitHeaders);
  }

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
    return errorResponse(message, 400, rateLimitHeaders);
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
    return errorResponse(`Application not found: ${applicationId}`, 404, rateLimitHeaders);
  }

  // Verify application is in correct stage
  if (
    application.currentStage !== 'SPECIALIZED_COMPETENCIES' &&
    application.currentStage !== 'GENERAL_COMPETENCIES'
  ) {
    console.error(
      `[Webhook SC] Application ${sanitizeForLog(applicationId)} is in ${sanitizeForLog(application.currentStage)} stage, expected SPECIALIZED_COMPETENCIES`
    );
    return errorResponse(
      `Application is not in the correct stage for specialized assessment`,
      400,
      rateLimitHeaders
    );
  }

  // Verify application is still active
  if (application.status !== 'ACTIVE') {
    console.error(`[Webhook SC] Application ${sanitizeForLog(applicationId)} is ${sanitizeForLog(application.status)}, not ACTIVE`);
    return errorResponse(`Application is not active`, 400, rateLimitHeaders);
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
    'Specialized Competencies',
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
        ? 'Specialized competencies passed - application advanced to interview stage'
        : 'Specialized competencies not passed - application rejected',
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
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-webhook-secret, Authorization',
    },
  });
}
