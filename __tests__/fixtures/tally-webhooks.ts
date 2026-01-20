/**
 * Tally Webhook Test Fixtures
 *
 * Sample payloads for testing webhook handlers.
 */

import {
  APPLICATION_FIELD_KEYS,
  PACKAGE_CHECKBOX_IDS,
  GC_ASSESSMENT_FIELD_KEYS,
  SC_ASSESSMENT_FIELD_KEYS,
  type TallyWebhookPayload,
} from '@/lib/webhooks';

/**
 * Create a valid application webhook payload
 */
export function createApplicationPayload(overrides?: {
  email?: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  submissionId?: string;
  respondentId?: string;
}): TallyWebhookPayload {
  const {
    email = 'test@example.com',
    firstName = 'Test',
    lastName = 'User',
    position = 'Software Developer',
    submissionId = `sub-${Date.now()}`,
    respondentId = `resp-${Date.now()}`,
  } = overrides || {};

  return {
    eventId: `evt-${Date.now()}`,
    createdAt: new Date().toISOString(),
    data: {
      responseId: `resp-${Date.now()}`,
      submissionId,
      respondentId,
      formId: 'form-application',
      formName: 'Apply for a Role',
      createdAt: new Date().toISOString(),
      fields: [
        {
          key: APPLICATION_FIELD_KEYS.email,
          label: 'Email',
          type: 'INPUT_EMAIL',
          value: email,
        },
        {
          key: APPLICATION_FIELD_KEYS.firstName,
          label: 'First Name',
          type: 'INPUT_TEXT',
          value: firstName,
        },
        {
          key: APPLICATION_FIELD_KEYS.lastName,
          label: 'Last Name',
          type: 'INPUT_TEXT',
          value: lastName,
        },
        {
          key: `${APPLICATION_FIELD_KEYS.position}_hidden`,
          label: 'Position',
          type: 'HIDDEN_FIELDS',
          value: position,
        },
        {
          key: APPLICATION_FIELD_KEYS.phoneNumber,
          label: 'Phone',
          type: 'INPUT_PHONE',
          value: '+1-555-0100',
        },
        {
          key: APPLICATION_FIELD_KEYS.country,
          label: 'Country',
          type: 'DROPDOWN',
          value: 'United States',
        },
        {
          key: APPLICATION_FIELD_KEYS.portfolioLink,
          label: 'Portfolio',
          type: 'INPUT_LINK',
          value: 'https://example.com/portfolio',
        },
        {
          key: APPLICATION_FIELD_KEYS.educationLevel,
          label: 'Education',
          type: 'DROPDOWN',
          value: "Bachelor's Degree",
        },
        {
          key: APPLICATION_FIELD_KEYS.resumeFile,
          label: 'Resume',
          type: 'FILE_UPLOAD',
          value: [
            {
              id: 'file-1',
              name: 'resume.pdf',
              url: 'https://tally.so/files/resume.pdf',
              mimeType: 'application/pdf',
              size: 12345,
            },
          ],
        },
        {
          key: APPLICATION_FIELD_KEYS.academicBackground,
          label: 'Academic Background',
          type: 'TEXTAREA',
          value: 'Computer Science degree from MIT',
        },
        {
          key: APPLICATION_FIELD_KEYS.previousExperience,
          label: 'Previous Experience',
          type: 'TEXTAREA',
          value: '3 years of software development experience',
        },
        {
          key: APPLICATION_FIELD_KEYS.videoLink,
          label: 'Video Introduction',
          type: 'INPUT_LINK',
          value: 'https://youtube.com/watch?v=abc123',
        },
        {
          key: APPLICATION_FIELD_KEYS.packageContents,
          label: 'Package Contents',
          type: 'CHECKBOXES',
          value: [
            { id: PACKAGE_CHECKBOX_IDS.resume, text: 'Resume' },
            { id: PACKAGE_CHECKBOX_IDS.academicBg, text: 'Academic Background' },
            { id: PACKAGE_CHECKBOX_IDS.previousExp, text: 'Previous Experience' },
            { id: PACKAGE_CHECKBOX_IDS.videoIntro, text: 'Video Introduction' },
          ],
        },
      ],
    },
  };
}

/**
 * Create a minimal application webhook payload (only required fields)
 */
export function createMinimalApplicationPayload(overrides?: {
  email?: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  submissionId?: string;
}): TallyWebhookPayload {
  const {
    email = 'minimal@example.com',
    firstName = 'Minimal',
    lastName = 'User',
    position = 'Course Facilitator',
    submissionId = `sub-min-${Date.now()}`,
  } = overrides || {};

  return {
    eventId: `evt-min-${Date.now()}`,
    createdAt: new Date().toISOString(),
    data: {
      responseId: `resp-min-${Date.now()}`,
      submissionId,
      respondentId: `resp-min-${Date.now()}`,
      formId: 'form-application',
      formName: 'Apply for a Role',
      createdAt: new Date().toISOString(),
      fields: [
        {
          key: APPLICATION_FIELD_KEYS.email,
          label: 'Email',
          type: 'INPUT_EMAIL',
          value: email,
        },
        {
          key: APPLICATION_FIELD_KEYS.firstName,
          label: 'First Name',
          type: 'INPUT_TEXT',
          value: firstName,
        },
        {
          key: APPLICATION_FIELD_KEYS.lastName,
          label: 'Last Name',
          type: 'INPUT_TEXT',
          value: lastName,
        },
        {
          key: `${APPLICATION_FIELD_KEYS.position}_hidden`,
          label: 'Position',
          type: 'HIDDEN_FIELDS',
          value: position,
        },
      ],
    },
  };
}

/**
 * Create a GC assessment webhook payload
 */
export function createGCAssessmentPayload(overrides?: {
  personId?: string;
  score?: number;
  submissionId?: string;
}): TallyWebhookPayload {
  const {
    personId = 'person-123',
    score = 85,
    submissionId = `sub-gc-${Date.now()}`,
  } = overrides || {};

  return {
    eventId: `evt-gc-${Date.now()}`,
    createdAt: new Date().toISOString(),
    data: {
      responseId: `resp-gc-${Date.now()}`,
      submissionId,
      respondentId: `resp-gc-${Date.now()}`,
      formId: 'form-gc',
      formName: 'General Competencies Assessment',
      createdAt: new Date().toISOString(),
      fields: [
        {
          key: `${GC_ASSESSMENT_FIELD_KEYS.personId}_hidden`,
          label: 'Who',
          type: 'HIDDEN_FIELDS',
          value: personId,
        },
        {
          key: `${GC_ASSESSMENT_FIELD_KEYS.score}_calc`,
          label: 'Total Score',
          type: 'CALCULATED',
          value: score,
        },
        {
          key: `${GC_ASSESSMENT_FIELD_KEYS.environmentScore}_calc`,
          label: 'Environment Score',
          type: 'CALCULATED',
          value: score + 5,
        },
        {
          key: `${GC_ASSESSMENT_FIELD_KEYS.communicationsScore}_calc`,
          label: 'Communications Score',
          type: 'CALCULATED',
          value: score - 5,
        },
        {
          key: `${GC_ASSESSMENT_FIELD_KEYS.collaborationScore}_calc`,
          label: 'Collaboration Score',
          type: 'CALCULATED',
          value: score,
        },
      ],
    },
  };
}

/**
 * Create a SC assessment webhook payload
 */
export function createSCAssessmentPayload(overrides?: {
  applicationId?: string;
  personId?: string;
  score?: number;
  submissionId?: string;
}): TallyWebhookPayload {
  const {
    applicationId = 'app-123',
    personId = 'person-123',
    score = 80,
    submissionId = `sub-sc-${Date.now()}`,
  } = overrides || {};

  return {
    eventId: `evt-sc-${Date.now()}`,
    createdAt: new Date().toISOString(),
    data: {
      responseId: `resp-sc-${Date.now()}`,
      submissionId,
      respondentId: `resp-sc-${Date.now()}`,
      formId: 'form-sc',
      formName: 'Specialized Competencies Assessment',
      createdAt: new Date().toISOString(),
      fields: [
        {
          key: `${SC_ASSESSMENT_FIELD_KEYS.applicationId}_hidden`,
          label: 'Application ID',
          type: 'HIDDEN_FIELDS',
          value: applicationId,
        },
        {
          key: `${SC_ASSESSMENT_FIELD_KEYS.personId}_hidden`,
          label: 'Person ID',
          type: 'HIDDEN_FIELDS',
          value: personId,
        },
        {
          key: `${SC_ASSESSMENT_FIELD_KEYS.score}_calc`,
          label: 'Total Score',
          type: 'CALCULATED',
          value: score,
        },
      ],
    },
  };
}

/**
 * Create an invalid payload (missing required fields)
 */
export function createInvalidPayload(): TallyWebhookPayload {
  return {
    eventId: `evt-invalid-${Date.now()}`,
    createdAt: new Date().toISOString(),
    data: {
      responseId: `resp-invalid-${Date.now()}`,
      submissionId: `sub-invalid-${Date.now()}`,
      respondentId: `resp-invalid-${Date.now()}`,
      formId: 'form-invalid',
      formName: 'Invalid Form',
      createdAt: new Date().toISOString(),
      fields: [
        {
          key: 'random_field',
          label: 'Random',
          type: 'INPUT_TEXT',
          value: 'data',
        },
      ],
    },
  };
}

/**
 * Generate HMAC signature for a payload
 */
export function generateWebhookSignature(payload: unknown, secret: string): string {
  const { createHmac } = require('crypto');
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return createHmac('sha256', secret).update(body).digest('hex');
}
