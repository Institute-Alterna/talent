/**
 * Tally Agreement Signing Webhook Handler
 *
 * POST /api/webhooks/tally/agreement
 *
 * Receives agreement signing submissions from Tally forms.
 * Updates Application records with agreement data and advances to SIGNED stage.
 *
 * Flow:
 * 1. Verify webhook signature and IP
 * 2. Check rate limits
 * 3. Check idempotency (agreementTallySubmissionId)
 * 4. Extract agreement data
 * 5. Validate application exists, is ACCEPTED, and at AGREEMENT stage
 * 6. Store agreement data and advance to SIGNED
 * 7. Log to audit trail
 * 8. Return success
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  extractAgreementData,
  parseAndVerifyWebhook,
  webhookErrorResponse,
  webhookOptionsResponse,
} from '@/lib/webhooks';
import {
  getApplicationById,
  getApplicationByAgreementTallySubmissionId,
  updateApplicationAgreementAndAdvance,
} from '@/lib/services/applications';
import {
  logWebhookReceived,
  logStageChange,
} from '@/lib/audit';
import { sanitizeForLog } from '@/lib/security';

/**
 * POST /api/webhooks/tally/agreement
 *
 * Handle agreement signing submissions from Tally
 */
export async function POST(request: NextRequest) {
  // Verify, parse, and validate webhook request
  const parsed = await parseAndVerifyWebhook(request, '[Webhook Agreement]');
  if (!parsed.ok) return parsed.error;
  const { payload, ip, rateLimitHeaders } = parsed;

  const { submissionId, formId, formName } = payload.data;

  // Idempotency check - don't process duplicate submissions
  const existingAgreement = await getApplicationByAgreementTallySubmissionId(submissionId);
  if (existingAgreement) {
    console.log(`[Webhook Agreement] Duplicate submission ignored: ${sanitizeForLog(submissionId)}`);
    return NextResponse.json(
      {
        success: true,
        message: 'Duplicate submission - already processed',
        applicationId: existingAgreement.id,
      },
      { headers: rateLimitHeaders }
    );
  }

  // Extract agreement data
  let agreementResult;
  try {
    agreementResult = extractAgreementData(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to extract agreement data';
    console.error('[Webhook Agreement] Extraction error:', message);
    return webhookErrorResponse(message, 400, rateLimitHeaders);
  }

  const { applicationId, agreementData, tallySubmissionId } = agreementResult;

  // Look up application
  const application = await getApplicationById(applicationId);
  if (!application) {
    console.error(`[Webhook Agreement] Application not found: ${sanitizeForLog(applicationId)}`);
    return webhookErrorResponse('Application not found', 404, rateLimitHeaders);
  }

  // Derive person name from the agreement data (avoids extra DB query)
  const personName = `${agreementResult.agreementData.legalFirstName} ${agreementResult.agreementData.legalLastName}`;

  // Log webhook receipt (after extraction so we have applicationId and personId)
  await logWebhookReceived(
    'agreement',
    application.personId,
    applicationId,
    {
      submissionId,
      formId,
      formName,
      eventId: payload.eventId,
      personName,
      position: application.position,
    },
    ip
  );

  // Gracefully handle withdrawn offers — return 200 to prevent Tally retries
  if (application.status === 'REJECTED') {
    console.log(`[Webhook Agreement] Application ${sanitizeForLog(applicationId)} offer was withdrawn — signing ignored`);
    return NextResponse.json(
      {
        success: true,
        message: 'Application offer was withdrawn — signing ignored',
      },
      { headers: rateLimitHeaders }
    );
  }

  // Validate application is in correct state
  if (application.status !== 'ACCEPTED') {
    console.error(`[Webhook Agreement] Application ${sanitizeForLog(applicationId)} is not ACCEPTED (status: ${application.status})`);
    return webhookErrorResponse(
      `Application is not in ACCEPTED status (current: ${application.status})`,
      400,
      rateLimitHeaders
    );
  }

  if (application.currentStage !== 'AGREEMENT') {
    console.error(`[Webhook Agreement] Application ${sanitizeForLog(applicationId)} is not at AGREEMENT stage (stage: ${application.currentStage})`);
    return webhookErrorResponse(
      `Application is not at AGREEMENT stage (current: ${application.currentStage})`,
      400,
      rateLimitHeaders
    );
  }

  // Store agreement data and advance to SIGNED atomically
  await updateApplicationAgreementAndAdvance(application.id, {
    agreementSignedAt: new Date(),
    agreementTallySubmissionId: tallySubmissionId,
    agreementData,
  });

  await logStageChange(
    application.id,
    application.personId,
    'AGREEMENT',
    'SIGNED',
    undefined,
    `Auto-advanced: Agreement signed via Tally webhook by ${personName}`
  );

  console.log(
    `[Webhook Agreement] Agreement processed: ${sanitizeForLog(application.id)} for person ${sanitizeForLog(application.personId)}`
  );

  return NextResponse.json(
    {
      success: true,
      message: 'Agreement signed successfully - application advanced to SIGNED',
      data: {
        applicationId: application.id,
        personId: application.personId,
        currentStage: 'SIGNED',
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
