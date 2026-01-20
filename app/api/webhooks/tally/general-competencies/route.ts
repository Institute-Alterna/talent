/**
 * Tally General Competencies Assessment Webhook Handler
 *
 * POST /api/webhooks/tally/general-competencies
 *
 * Receives general competencies assessment results from Tally forms.
 * Updates Person records with GC score and advances/rejects applications.
 *
 * Flow:
 * 1. Verify webhook signature and IP
 * 2. Check rate limits
 * 3. Check idempotency (tallySubmissionId)
 * 4. Extract assessment data (personId, score)
 * 5. Update person with GC results
 * 6. Create Assessment record
 * 7. Find all active applications in APPLICATION or GENERAL_COMPETENCIES stage
 * 8. For each application: advance or reject based on score
 * 9. Log to audit trail
 * 10. Return success
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  verifyWebhook,
  getClientIP,
  webhookRateLimiter,
  getRateLimitHeaders,
  extractGCAssessmentData,
  type TallyWebhookPayload,
} from '@/lib/webhooks';
import { db } from '@/lib/db';
import {
  getPersonById,
  updateGeneralCompetencies,
  hasPassedGeneralCompetencies,
} from '@/lib/services/persons';
import {
  getApplicationsAwaitingGCResult,
  advanceMultipleApplications,
  rejectMultipleApplications,
} from '@/lib/services/applications';
import {
  logWebhookReceived,
  logAssessmentCompleted,
  logStageChange,
  logStatusChange,
} from '@/lib/audit';
import { recruitment } from '@/config/recruitment';

/**
 * Webhook error response
 */
function errorResponse(message: string, status: number, headers?: Record<string, string>) {
  return NextResponse.json({ error: message }, { status, headers });
}

/**
 * POST /api/webhooks/tally/general-competencies
 *
 * Handle GC assessment completion from Tally
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
    console.error('[Webhook GC] Verification failed:', verification.error);
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
    console.log(`[Webhook GC] Duplicate submission ignored: ${submissionId}`);
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
    assessmentData = extractGCAssessmentData(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to extract assessment data';
    console.error('[Webhook GC] Extraction error:', message);
    return errorResponse(message, 400, rateLimitHeaders);
  }

  const { personId, score, rawData, tallySubmissionId } = assessmentData;

  // Log webhook receipt
  await logWebhookReceived(
    'general-competencies',
    personId,
    undefined,
    {
      submissionId,
      formId,
      formName,
      score,
    },
    ip
  );

  // Verify person exists
  const person = await getPersonById(personId);
  if (!person) {
    console.error(`[Webhook GC] Person not found: ${personId}`);
    return errorResponse(`Person not found: ${personId}`, 404, rateLimitHeaders);
  }

  // Check if person already completed GC
  if (person.generalCompetenciesCompleted) {
    console.log(`[Webhook GC] Person ${personId} already completed GC, updating score`);
  }

  // Determine pass/fail
  const threshold = recruitment.assessmentThresholds.generalCompetencies;
  const passed = score >= threshold;

  // Update person with GC results
  await updateGeneralCompetencies(personId, {
    generalCompetenciesCompleted: true,
    generalCompetenciesScore: score,
    generalCompetenciesPassedAt: passed ? new Date() : undefined,
  });

  // Create Assessment record
  const assessment = await db.assessment.create({
    data: {
      personId,
      assessmentType: 'GENERAL_COMPETENCIES',
      score,
      passed,
      threshold,
      completedAt: new Date(),
      rawData,
      tallySubmissionId,
    },
  });

  await logAssessmentCompleted(personId, null, 'General Competencies', score, passed);

  // Get all applications awaiting GC result
  const awaitingApplications = await getApplicationsAwaitingGCResult(personId);
  const applicationIds = awaitingApplications.map((a) => a.id);

  let applicationsAdvanced = 0;
  let applicationsRejected = 0;

  if (applicationIds.length > 0) {
    if (passed) {
      // Advance all applications to SPECIALIZED_COMPETENCIES
      await advanceMultipleApplications(applicationIds, 'SPECIALIZED_COMPETENCIES');
      applicationsAdvanced = applicationIds.length;

      // Log stage changes for each application
      for (const app of awaitingApplications) {
        await logStageChange(
          app.id,
          personId,
          app.currentStage,
          'SPECIALIZED_COMPETENCIES',
          undefined,
          `General competencies passed with score ${score}/${threshold}`
        );
      }

      // TODO: In Phase 6c, send success emails for each application
      // for (const app of awaitingApplications) {
      //   await sendEmail(person.email, 'general-competencies-passed', { position: app.position });
      // }
    } else {
      // Reject all applications
      await rejectMultipleApplications(applicationIds);
      applicationsRejected = applicationIds.length;

      // Log status changes for each application
      for (const app of awaitingApplications) {
        await logStatusChange(
          app.id,
          personId,
          'ACTIVE',
          'REJECTED',
          undefined,
          `General competencies failed with score ${score}/${threshold}`
        );
      }

      // TODO: In Phase 6c, send rejection emails for each application
      // for (const app of awaitingApplications) {
      //   await sendEmail(person.email, 'general-competencies-failed', { position: app.position });
      // }
    }
  }

  console.log(
    `[Webhook GC] Assessment processed: Person ${personId}, Score: ${score}/${threshold}, ` +
      `Passed: ${passed}, Applications advanced: ${applicationsAdvanced}, rejected: ${applicationsRejected}`
  );

  return NextResponse.json(
    {
      success: true,
      message: passed
        ? 'General competencies passed - applications advanced'
        : 'General competencies not passed - applications rejected',
      data: {
        assessmentId: assessment.id,
        personId,
        score,
        threshold,
        passed,
        applicationsAdvanced,
        applicationsRejected,
        applicationIds,
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
      'Access-Control-Allow-Headers': 'Content-Type, tally-signature',
    },
  });
}
