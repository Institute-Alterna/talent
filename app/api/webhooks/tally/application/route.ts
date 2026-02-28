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
  extractPersonData,
  extractApplicationData,
  parseAndVerifyWebhook,
  webhookErrorResponse,
  webhookOptionsResponse,
} from '@/lib/webhooks';
import { findOrCreatePerson, hasPassedGeneralCompetencies } from '@/lib/services/persons';
import {
  createApplication,
  getApplicationByTallySubmissionId,
  advanceApplicationStage,
} from '@/lib/services/applications';
import {
  logWebhookReceived,
  logPersonCreated,
  logApplicationCreated,
  logStageChange,
} from '@/lib/audit';

import { sendApplicationReceived } from '@/lib/email';
import { sanitizeForLog } from '@/lib/security';

/**
 * POST /api/webhooks/tally/application
 *
 * Handle new application submissions from Tally
 */
export async function POST(request: NextRequest) {
  // Verify, parse, and validate webhook request
  const parsed = await parseAndVerifyWebhook(request, '[Webhook]');
  if (!parsed.ok) return parsed.error;
  const { payload, ip, rateLimitHeaders } = parsed;

  const { submissionId, formId, formName } = payload.data;

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
    return webhookErrorResponse(message, 400, rateLimitHeaders);
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
    return webhookErrorResponse(message, 400, rateLimitHeaders);
  }

  // Create application
  const application = await createApplication(applicationData);

  // Log webhook receipt (after person and application are known for full context)
  await logWebhookReceived(
    'application',
    person.id,
    application.id,
    {
      submissionId,
      formId,
      formName,
      eventId: payload.eventId,
      personName: `${person.firstName} ${person.lastName}`,
      personCreated,
      position: application.position,
    },
    ip
  );

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

  // Send application-received confirmation email (non-fatal)
  try {
    await sendApplicationReceived(
      person.id,
      application.id,
      person.email,
      person.firstName,
      application.position,
      application.createdAt
    );
  } catch (emailError) {
    console.error(
      '[Webhook] Failed to send application-received email:',
      emailError instanceof Error ? emailError.message : emailError
    );
  }

  // Determine next steps based on GC status.
  // Applications now start at GENERAL_COMPETENCIES (no APPLICATION stage),
  // so we only need to advance if the person already passed GC.
  let nextStep: 'awaiting_gc' | 'advance_to_specialized' | 'awaiting_gc_decision';
  let statusMessage: string;

  if (!person.generalCompetenciesCompleted) {
    // Person hasn't taken GC yet — stays at GENERAL_COMPETENCIES (default).
    // The GC invitation email is sent manually by the admin.
    nextStep = 'awaiting_gc';
    statusMessage = 'Application received. General competencies assessment pending.';
  } else {
    // Person has already completed GC
    const passedGC = await hasPassedGeneralCompetencies(person.id);

    if (passedGC) {
      // GC passed — advance to specialised competencies
      nextStep = 'advance_to_specialized';
      statusMessage = 'Application received. Advancing to specialised competencies stage.';

      await advanceApplicationStage(application.id, 'SPECIALIZED_COMPETENCIES');
      await logStageChange(
        application.id,
        person.id,
        'GENERAL_COMPETENCIES',
        'SPECIALIZED_COMPETENCIES',
        undefined,
        'Auto-advanced: Person already passed general competencies'
      );
    } else {
      // GC failed — stays at GENERAL_COMPETENCIES for admin to reject manually
      nextStep = 'awaiting_gc_decision';
      statusMessage = 'Application received. General competencies not passed — awaiting admin decision.';
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
  return webhookOptionsResponse();
}
