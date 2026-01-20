/**
 * Tally Application Webhook Handler
 *
 * POST /api/webhooks/tally/application
 *
 * Receives new application submissions from Tally forms.
 * Creates or updates Person records and creates Application records.
 *
 * Flow:
 * 1. Verify webhook signature and IP
 * 2. Check rate limits
 * 3. Check idempotency (tallySubmissionId)
 * 4. Extract person data, find or create person
 * 5. Extract application data, create application
 * 6. Check if person needs to take GC assessment
 * 7. Log to audit trail
 * 8. Return success
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  verifyWebhook,
  getClientIP,
  webhookRateLimiter,
  getRateLimitHeaders,
  extractPersonData,
  extractApplicationData,
  type TallyWebhookPayload,
} from '@/lib/webhooks';
import { findOrCreatePerson, hasPassedGeneralCompetencies } from '@/lib/services/persons';
import {
  createApplication,
  getApplicationByTallySubmissionId,
  advanceApplicationStage,
  updateApplicationStatus,
} from '@/lib/services/applications';
import {
  logWebhookReceived,
  logPersonCreated,
  logApplicationCreated,
  logStageChange,
  logStatusChange,
} from '@/lib/audit';
import { sanitizeForLog } from '@/lib/security';
import { recruitment } from '@/config/recruitment';

/**
 * Webhook error response
 */
function errorResponse(message: string, status: number, headers?: Record<string, string>) {
  return NextResponse.json({ error: message }, { status, headers });
}

/**
 * POST /api/webhooks/tally/application
 *
 * Handle new application submissions from Tally
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
    console.error('[Webhook] Verification failed:', verification.error);
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

  // Log webhook receipt
  await logWebhookReceived(
    'application',
    undefined,
    undefined,
    {
      submissionId,
      formId,
      formName,
      eventId: payload.eventId,
    },
    ip
  );

  // Idempotency check - don't process duplicate submissions
  const existingApplication = await getApplicationByTallySubmissionId(submissionId);
  if (existingApplication) {
    console.log(`[Webhook] Duplicate submission ignored: ${sanitizeForLog(submissionId)}`);
    return NextResponse.json(
      {
        success: true,
        message: 'Duplicate submission - already processed',
        applicationId: existingApplication.id,
      },
      { headers: rateLimitHeaders }
    );
  }

  // Extract and validate person data
  let personData;
  try {
    personData = extractPersonData(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to extract person data';
    console.error('[Webhook] Person extraction error:', message);
    return errorResponse(message, 400, rateLimitHeaders);
  }

  // Find or create person
  const { person, created: personCreated } = await findOrCreatePerson(personData);

  if (personCreated) {
    await logPersonCreated(
      person.id,
      {
        email: person.email,
        firstName: person.firstName,
        lastName: person.lastName,
        source: 'tally_application',
      },
      ip
    );
  }

  // Extract application data
  let applicationData;
  try {
    applicationData = extractApplicationData(payload, person.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to extract application data';
    console.error('[Webhook] Application extraction error:', message);
    return errorResponse(message, 400, rateLimitHeaders);
  }

  // Create application
  const application = await createApplication(applicationData);

  await logApplicationCreated(
    application.id,
    person.id,
    application.position,
    {
      tallySubmissionId: submissionId,
      formId,
      personCreated,
    },
    ip
  );

  // Determine next steps based on GC status
  let nextStep: 'send_gc_assessment' | 'advance_to_specialized' | 'reject';
  let statusMessage: string;

  if (!person.generalCompetenciesCompleted) {
    // Person hasn't taken GC yet - they need to take it
    nextStep = 'send_gc_assessment';
    statusMessage = 'Application received. General competencies assessment email will be sent.';

    // TODO: In Phase 6c, trigger email send here
    // await sendEmail(person.email, 'general-competencies-invitation', { ... });
  } else {
    // Person has already completed GC
    const passedGC = await hasPassedGeneralCompetencies(person.id);

    if (passedGC) {
      // GC passed - advance to next stage
      nextStep = 'advance_to_specialized';
      statusMessage = 'Application received. Advancing to specialized competencies stage.';

      // Advance the application stage
      await advanceApplicationStage(application.id, 'SPECIALIZED_COMPETENCIES');
      await logStageChange(
        application.id,
        person.id,
        'APPLICATION',
        'SPECIALIZED_COMPETENCIES',
        undefined,
        'Auto-advanced: Person already passed general competencies'
      );

      // TODO: In Phase 6c, send specialized competencies email if configured
    } else {
      // GC failed - reject this application
      nextStep = 'reject';
      statusMessage = 'Application received but rejected: General competencies not passed.';

      await updateApplicationStatus(application.id, 'REJECTED');
      await logStatusChange(
        application.id,
        person.id,
        'ACTIVE',
        'REJECTED',
        undefined,
        'Auto-rejected: Person previously failed general competencies'
      );

      // TODO: In Phase 6c, send rejection email
    }
  }

  // Calculate missing fields for response
  const missingFields: string[] = [];
  if (application.hasResume && !application.resumeUrl) missingFields.push('Resume');
  if (application.hasAcademicBg && !application.academicBackground)
    missingFields.push('Academic Background');
  if (application.hasVideoIntro && !application.videoLink) missingFields.push('Video Introduction');
  if (application.hasPreviousExp && !application.previousExperience)
    missingFields.push('Previous Experience');
  if (application.hasOtherFile && !application.otherFileUrl) missingFields.push('Other File');

  console.log(
    `[Webhook] Application processed: ${sanitizeForLog(application.id)} for ${sanitizeForLog(person.email)} - ${nextStep}`
  );

  return NextResponse.json(
    {
      success: true,
      message: statusMessage,
      data: {
        applicationId: application.id,
        personId: person.id,
        personCreated,
        position: application.position,
        currentStage: application.currentStage,
        status: application.status,
        nextStep,
        missingFields: missingFields.length > 0 ? missingFields : undefined,
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
