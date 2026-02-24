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
  AGREEMENT_FIELD_KEYS,
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
          label: 'who',
          type: 'HIDDEN_FIELDS',
          value: personId,
        },
        {
          key: `${GC_ASSESSMENT_FIELD_KEYS.score}_calc`,
          label: 'score',
          type: 'CALCULATED_FIELDS',
          value: score,
        },
        {
          key: `${GC_ASSESSMENT_FIELD_KEYS.cultureScore}_calc`,
          label: 'cultureScore',
          type: 'CALCULATED_FIELDS',
          value: Math.round(score * 0.36),
        },
        {
          key: `${GC_ASSESSMENT_FIELD_KEYS.situationalScore}_calc`,
          label: 'situationalScore',
          type: 'CALCULATED_FIELDS',
          value: Math.round(score * 0.34),
        },
        {
          key: `${GC_ASSESSMENT_FIELD_KEYS.digitalScore}_calc`,
          label: 'digitalScore',
          type: 'CALCULATED_FIELDS',
          value: Math.round(score * 0.30),
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
  scId?: string;
  submissionId?: string;
  withFileUpload?: boolean;
}): TallyWebhookPayload {
  const {
    applicationId = 'app-123',
    personId = 'person-123',
    score,
    scId = 'sc-def0-1234-5678-9abc-def012345678',
    submissionId = `sub-sc-${Date.now()}`,
    withFileUpload = false,
  } = overrides || {};

  const fields: TallyWebhookPayload['data']['fields'] = [
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
      key: `${SC_ASSESSMENT_FIELD_KEYS.specialisedCompetencyId}_hidden`,
      label: 'SC Definition ID',
      type: 'HIDDEN_FIELDS',
      value: scId,
    },
  ];

  if (score !== undefined) {
    fields.push({
      key: `${SC_ASSESSMENT_FIELD_KEYS.score}_calc`,
      label: 'Total Score',
      type: 'CALCULATED',
      value: score,
    });
  }

  if (withFileUpload) {
    fields.push({
      key: 'question_FileUpload_work_sample',
      label: 'Work Sample',
      type: 'FILE_UPLOAD',
      value: [{ id: 'file-abc', name: 'sample.pdf', url: 'https://storage.example.com/sample.pdf', mimeType: 'application/pdf', size: 12345 }],
    });
  }

  return {
    eventId: `evt-sc-${Date.now()}`,
    createdAt: new Date().toISOString(),
    data: {
      responseId: `resp-sc-${Date.now()}`,
      submissionId,
      respondentId: `resp-sc-${Date.now()}`,
      formId: 'form-sc',
      formName: 'Specialised Competencies Assessment',
      createdAt: new Date().toISOString(),
      fields,
    },
  };
}

/**
 * Create an agreement signing webhook payload
 */
export function createAgreementPayload(overrides?: {
  applicationId?: string;
  legalFirstName?: string;
  legalLastName?: string;
  submissionId?: string;
}): TallyWebhookPayload {
  const {
    applicationId = 'app-123',
    legalFirstName = 'John',
    legalLastName = 'Doe',
    submissionId = `sub-agree-${Date.now()}`,
  } = overrides || {};

  return {
    eventId: `evt-agree-${Date.now()}`,
    createdAt: new Date().toISOString(),
    data: {
      responseId: `resp-agree-${Date.now()}`,
      submissionId,
      respondentId: `resp-agree-${Date.now()}`,
      formId: 'form-agreement',
      formName: 'Team Agreement',
      createdAt: new Date().toISOString(),
      fields: [
        {
          key: AGREEMENT_FIELD_KEYS.applicationId,
          label: 'Internal ID',
          type: 'HIDDEN_FIELDS',
          value: applicationId,
        },
        {
          key: AGREEMENT_FIELD_KEYS.legalFirstName,
          label: 'First Legal Name',
          type: 'INPUT_TEXT',
          value: legalFirstName,
        },
        {
          key: AGREEMENT_FIELD_KEYS.legalMiddleName,
          label: 'Middle Legal Name',
          type: 'INPUT_TEXT',
          value: 'Michael',
        },
        {
          key: AGREEMENT_FIELD_KEYS.legalLastName,
          label: 'Last Legal Name',
          type: 'INPUT_TEXT',
          value: legalLastName,
        },
        {
          key: AGREEMENT_FIELD_KEYS.preferredFirstName,
          label: 'First Preferred Name',
          type: 'INPUT_TEXT',
          value: 'Johnny',
        },
        {
          key: AGREEMENT_FIELD_KEYS.preferredLastName,
          label: 'Last Preferred Name',
          type: 'INPUT_TEXT',
          value: 'D',
        },
        {
          key: AGREEMENT_FIELD_KEYS.profilePicture,
          label: 'Profile Picture',
          type: 'FILE_UPLOAD',
          value: [
            {
              id: 'file-pic-1',
              name: 'profile.jpg',
              url: 'https://tally.so/files/profile.jpg',
              mimeType: 'image/jpeg',
              size: 50000,
            },
          ],
        },
        {
          key: AGREEMENT_FIELD_KEYS.biography,
          label: 'Biography',
          type: 'TEXTAREA',
          value: 'A passionate software developer.',
        },
        {
          key: AGREEMENT_FIELD_KEYS.dateOfBirth,
          label: 'Date of Birth',
          type: 'INPUT_DATE',
          value: '1990-05-15',
        },
        {
          key: AGREEMENT_FIELD_KEYS.country,
          label: 'Country',
          type: 'DROPDOWN',
          value: 'United States',
        },
        {
          key: AGREEMENT_FIELD_KEYS.privacyPolicy,
          label: 'Privacy Policy',
          type: 'CHECKBOXES',
          value: [{ id: 'privacy-1', text: 'I accept the privacy policy' }],
        },
        {
          key: AGREEMENT_FIELD_KEYS.signature,
          label: 'Signature',
          type: 'SIGNATURE',
          value: [
            {
              id: 'sig-1',
              name: 'signature.png',
              url: 'https://tally.so/files/signature.png',
              mimeType: 'image/png',
              size: 10000,
            },
          ],
        },
        {
          key: AGREEMENT_FIELD_KEYS.entityRepresented,
          label: 'Entity Represented',
          type: 'INPUT_TEXT',
          value: 'Self',
        },
        {
          key: AGREEMENT_FIELD_KEYS.serviceHours,
          label: 'Service Hours',
          type: 'DROPDOWN',
          value: '20 hours per week',
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
 * Get webhook secret for use in tests
 *
 * Since we switched from HMAC signature verification to simple secret header,
 * this now just returns the secret directly.
 *
 * @deprecated Use the secret directly instead of calling this function
 */
export function generateWebhookSignature(_payload: unknown, secret: string): string {
  // No longer generating HMAC - just return the secret for header auth
  return secret;
}
