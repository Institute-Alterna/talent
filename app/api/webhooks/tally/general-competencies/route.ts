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
  extractGCAssessmentData,
  parseAndVerifyWebhook,
  webhookErrorResponse,
  webhookOptionsResponse,
} from '@/lib/webhooks';
import { db } from '@/lib/db';
import { Prisma } from '@/lib/generated/prisma/client';
import {
  getPersonById,
  updateGeneralCompetencies,
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
import { sanitizeForLog } from '@/lib/security';

/**
 * POST /api/webhooks/tally/general-competencies
 *
 * Handle GC assessment completion from Tally
 */
export async function POST(request: NextRequest) {
  // Verify, parse, and validate webhook request
  const parsed = await parseAndVerifyWebhook(request, '[Webhook GC]');
  if (!parsed.ok) return parsed.error;
  const { payload, ip, rateLimitHeaders } = parsed;

  const { submissionId, formId, formName } = payload.data;

  // Check for exact duplicate submission (same submissionId = already processed)
  const exactDuplicate = await db.assessment.findUnique({
    where: { tallySubmissionId: submissionId },
  });

  if (exactDuplicate) {
    console.log(`[Webhook GC] Duplicate submission ignored: ${sanitizeForLog(submissionId)}`);
    return NextResponse.json(
      {
        success: true,
        message: 'Duplicate submission - already processed',
        assessmentId: exactDuplicate.id,
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
    return webhookErrorResponse(message, 400, rateLimitHeaders);
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
    console.error(`[Webhook GC] Person not found: ${sanitizeForLog(personId)}`);
    return webhookErrorResponse('Person not found', 404, rateLimitHeaders);
  }

  // Check if person already completed GC
  if (person.generalCompetenciesCompleted) {
    console.log(`[Webhook GC] Person ${sanitizeForLog(personId)} already completed GC, updating score`);
  }

  // Determine pass/fail
  const { threshold, scale } = recruitment.assessmentThresholds.generalCompetencies;
  const passed = score >= threshold;

  // Update person with GC results
  await updateGeneralCompetencies(personId, {
    generalCompetenciesCompleted: true,
    generalCompetenciesScore: score,
    generalCompetenciesPassedAt: passed ? new Date() : undefined,
  });

  // Overwrite any previous GC assessment for this person — a re-submission
  // (e.g. error correction) should replace the old record entirely.
  // Wrap in a transaction so we never lose data if the process crashes mid-way.
  const assessment = await db.$transaction(async (tx) => {
    await tx.assessment.deleteMany({
      where: { personId, assessmentType: 'GENERAL_COMPETENCIES' },
    });

    return tx.assessment.create({
      data: {
        personId,
        assessmentType: 'GENERAL_COMPETENCIES',
        score,
        passed,
        threshold,
        completedAt: new Date(),
        rawData: rawData as unknown as Prisma.InputJsonValue,
        tallySubmissionId,
      },
    });
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
          `General competencies passed with score ${score}/${scale} (threshold: ${threshold})`
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
          `General competencies failed with score ${score}/${scale} (threshold: ${threshold})`
        );
      }

      // TODO: In Phase 6c, send rejection emails for each application
      // for (const app of awaitingApplications) {
      //   await sendEmail(person.email, 'general-competencies-failed', { position: app.position });
      // }
    }
  }

  console.log(
    `[Webhook GC] Assessment processed: Person ${sanitizeForLog(personId)}, Score: ${sanitizeForLog(score)}/${scale} (threshold: ${threshold}), ` +
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
  return webhookOptionsResponse();
}
