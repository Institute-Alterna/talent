/**
 * Tally Webhook Field Mapper
 *
 * Maps fields from Tally webhook payloads to our database schema.
 * Handles the extraction and transformation of form data.
 */

import type { CreatePersonData } from '@/types/person';
import type { CreateApplicationData } from '@/types/application';

/**
 * Tally webhook payload structure
 */
export interface TallyWebhookPayload {
  eventId: string;
  createdAt: string;
  data: {
    responseId: string;
    submissionId: string;
    respondentId: string;
    formId: string;
    formName: string;
    createdAt: string;
    fields: TallyField[];
  };
}

/**
 * Individual field in Tally form response
 */
export interface TallyField {
  key: string;
  label: string;
  type: string;
  value: TallyFieldValue;
  options?: TallyFieldOption[];
}

/**
 * Tally field value can be various types
 */
export type TallyFieldValue =
  | string
  | number
  | boolean
  | null
  | TallyFileUpload[]
  | TallyCheckboxValue[];

/**
 * File upload field value
 */
export interface TallyFileUpload {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
}

/**
 * Checkbox option value
 */
export interface TallyCheckboxValue {
  id: string;
  text: string;
}

/**
 * Tally field option (for dropdowns, checkboxes)
 */
export interface TallyFieldOption {
  id: string;
  text: string;
}

/**
 * Field key mappings for application form
 *
 * These match the Tally form field keys from the webhook payload.
 * Update these if the form is modified in Tally.
 */
export const APPLICATION_FIELD_KEYS = {
  // Person fields
  email: 'question_eaYYNE',
  firstName: 'question_qRkkYd',
  lastName: 'question_Q7OOxA',
  phoneNumber: 'question_97oo61',
  country: 'question_o2vAjV',
  portfolioLink: 'question_W8jjeP',
  educationLevel: 'question_a2aajE',

  // Application fields
  position: 'question_KVavqX', // Hidden field with position
  resumeFile: 'question_7NppJ9',
  academicBackground: 'question_bW6622',
  previousExperience: 'question_kNkk0J',
  videoLink: 'question_Bx22LA',
  otherFile: 'question_97Md1Y',

  // Package contents checkboxes (what applicant claims to submit)
  packageContents: 'question_6Zpp1O',
} as const;

/**
 * Package contents checkbox option IDs
 *
 * These IDs match the specific checkbox options in the Tally form.
 */
export const PACKAGE_CHECKBOX_IDS = {
  resume: 'f0b59c5e-a761-422d-9f4f-b0877d763e31',
  academicBg: '3bbe2067-a65b-447d-8dd0-52b6cc2b9c22',
  videoIntro: '08626196-8186-4941-b743-f71b94eaee6f',
  previousExp: '5135f2af-01e6-4bb3-b8f5-cc4c534ea572',
  otherFile: '2163f28f-e7c4-47c4-a6df-535153718b44',
} as const;

/**
 * Field key mappings for general competencies assessment
 */
export const GC_ASSESSMENT_FIELD_KEYS = {
  personId: 'question_PzkEpx', // Hidden field with person ID (who)
  name: 'question_Z2DVAV', // Hidden field for verification
  score: 'question_Q7k02g', // Calculated total score

  // Section scores (optional detailed tracking)
  environmentScore: 'question_eaykXq',
  communicationsScore: 'question_W8Qx7J',
  collaborationScore: 'question_a2k7M9',
  learnScore: 'question_pD582V',
  behaviourScore: 'question_yJgVa0',
} as const;

/**
 * Field key mappings for specialized competencies assessment
 */
export const SC_ASSESSMENT_FIELD_KEYS = {
  applicationId: 'question_AppId', // Hidden field with application ID
  personId: 'question_PzkEpx', // Hidden field with person ID (fallback)
  score: 'question_Score', // Calculated total score
} as const;

/**
 * Find a field by its key prefix
 *
 * Tally may append suffixes to keys for hidden fields.
 * This function finds fields that start with the given key.
 *
 * @param fields - Array of Tally fields
 * @param keyPrefix - The field key prefix to search for
 * @returns The matching field or undefined
 */
export function findFieldByKey(fields: TallyField[], keyPrefix: string): TallyField | undefined {
  return fields.find((f) => f.key.startsWith(keyPrefix));
}

/**
 * Get string value from a field
 *
 * @param field - The Tally field
 * @returns String value or undefined
 */
export function getStringValue(field: TallyField | undefined): string | undefined {
  if (!field || field.value === null || field.value === undefined) {
    return undefined;
  }

  if (typeof field.value === 'string') {
    return field.value.trim() || undefined;
  }

  if (typeof field.value === 'number') {
    return String(field.value);
  }

  return undefined;
}

/**
 * Get number value from a field
 *
 * @param field - The Tally field
 * @returns Number value or undefined
 */
export function getNumberValue(field: TallyField | undefined): number | undefined {
  if (!field || field.value === null || field.value === undefined) {
    return undefined;
  }

  if (typeof field.value === 'number') {
    return field.value;
  }

  if (typeof field.value === 'string') {
    const parsed = parseFloat(field.value);
    return isNaN(parsed) ? undefined : parsed;
  }

  return undefined;
}

/**
 * Get file URL from a file upload field
 *
 * @param field - The Tally field
 * @returns File URL or undefined
 */
export function getFileUrl(field: TallyField | undefined): string | undefined {
  if (!field || !Array.isArray(field.value) || field.value.length === 0) {
    return undefined;
  }

  // Check if it's a file upload array
  const firstItem = field.value[0] as TallyFileUpload | TallyCheckboxValue;
  if ('url' in firstItem) {
    return firstItem.url;
  }

  return undefined;
}

/**
 * Check if a specific checkbox option is selected
 *
 * @param field - The Tally checkbox field
 * @param optionId - The option ID to check
 * @returns Boolean indicating if option is selected
 */
export function isCheckboxSelected(field: TallyField | undefined, optionId: string): boolean {
  if (!field || !Array.isArray(field.value)) {
    return false;
  }

  // Checkbox values are an array of selected options
  return (field.value as TallyCheckboxValue[]).some(
    (v) => typeof v === 'object' && v !== null && v.id === optionId
  );
}

/**
 * Extract person data from application webhook payload
 *
 * @param payload - The Tally webhook payload
 * @returns Person data for creation
 */
export function extractPersonData(payload: TallyWebhookPayload): CreatePersonData {
  const { fields, respondentId } = payload.data;

  const emailField = findFieldByKey(fields, APPLICATION_FIELD_KEYS.email);
  const email = getStringValue(emailField);

  if (!email) {
    throw new Error('Email is required but missing from webhook payload');
  }

  const firstNameField = findFieldByKey(fields, APPLICATION_FIELD_KEYS.firstName);
  const firstName = getStringValue(firstNameField);

  if (!firstName) {
    throw new Error('First name is required but missing from webhook payload');
  }

  const lastNameField = findFieldByKey(fields, APPLICATION_FIELD_KEYS.lastName);
  const lastName = getStringValue(lastNameField);

  if (!lastName) {
    throw new Error('Last name is required but missing from webhook payload');
  }

  return {
    email,
    firstName,
    lastName,
    phoneNumber: getStringValue(findFieldByKey(fields, APPLICATION_FIELD_KEYS.phoneNumber)),
    country: getStringValue(findFieldByKey(fields, APPLICATION_FIELD_KEYS.country)),
    portfolioLink: getStringValue(findFieldByKey(fields, APPLICATION_FIELD_KEYS.portfolioLink)),
    educationLevel: getStringValue(findFieldByKey(fields, APPLICATION_FIELD_KEYS.educationLevel)),
    tallyRespondentId: respondentId,
  };
}

/**
 * Extract application data from application webhook payload
 *
 * @param payload - The Tally webhook payload
 * @param personId - The ID of the associated person
 * @returns Application data for creation
 */
export function extractApplicationData(
  payload: TallyWebhookPayload,
  personId: string
): CreateApplicationData {
  const { fields, submissionId, responseId, formId } = payload.data;

  const positionField = findFieldByKey(fields, APPLICATION_FIELD_KEYS.position);
  const position = getStringValue(positionField);

  if (!position) {
    throw new Error('Position is required but missing from webhook payload');
  }

  // Extract package contents checkbox values
  const packageField = findFieldByKey(fields, APPLICATION_FIELD_KEYS.packageContents);

  return {
    personId,
    position,
    resumeUrl: getFileUrl(findFieldByKey(fields, APPLICATION_FIELD_KEYS.resumeFile)),
    academicBackground: getStringValue(
      findFieldByKey(fields, APPLICATION_FIELD_KEYS.academicBackground)
    ),
    previousExperience: getStringValue(
      findFieldByKey(fields, APPLICATION_FIELD_KEYS.previousExperience)
    ),
    videoLink: getStringValue(findFieldByKey(fields, APPLICATION_FIELD_KEYS.videoLink)),
    otherFileUrl: getFileUrl(findFieldByKey(fields, APPLICATION_FIELD_KEYS.otherFile)),
    hasResume: isCheckboxSelected(packageField, PACKAGE_CHECKBOX_IDS.resume),
    hasAcademicBg: isCheckboxSelected(packageField, PACKAGE_CHECKBOX_IDS.academicBg),
    hasVideoIntro: isCheckboxSelected(packageField, PACKAGE_CHECKBOX_IDS.videoIntro),
    hasPreviousExp: isCheckboxSelected(packageField, PACKAGE_CHECKBOX_IDS.previousExp),
    hasOtherFile: isCheckboxSelected(packageField, PACKAGE_CHECKBOX_IDS.otherFile),
    tallySubmissionId: submissionId,
    tallyResponseId: responseId,
    tallyFormId: formId,
  };
}

/**
 * GC assessment result data
 */
export interface GCAssessmentResult {
  personId: string;
  score: number;
  rawData: {
    environmentScore?: number;
    communicationsScore?: number;
    collaborationScore?: number;
    learnScore?: number;
    behaviourScore?: number;
  };
  tallySubmissionId: string;
}

/**
 * Extract general competencies assessment data from webhook payload
 *
 * @param payload - The Tally webhook payload
 * @returns GC assessment data
 */
export function extractGCAssessmentData(payload: TallyWebhookPayload): GCAssessmentResult {
  const { fields, submissionId } = payload.data;

  const personIdField = findFieldByKey(fields, GC_ASSESSMENT_FIELD_KEYS.personId);
  const personId = getStringValue(personIdField);

  if (!personId) {
    throw new Error('Person ID (who) is required but missing from GC assessment webhook');
  }

  const scoreField = findFieldByKey(fields, GC_ASSESSMENT_FIELD_KEYS.score);
  const score = getNumberValue(scoreField);

  if (score === undefined) {
    throw new Error('Score is required but missing from GC assessment webhook');
  }

  // Extract section scores for detailed tracking
  const rawData = {
    environmentScore: getNumberValue(
      findFieldByKey(fields, GC_ASSESSMENT_FIELD_KEYS.environmentScore)
    ),
    communicationsScore: getNumberValue(
      findFieldByKey(fields, GC_ASSESSMENT_FIELD_KEYS.communicationsScore)
    ),
    collaborationScore: getNumberValue(
      findFieldByKey(fields, GC_ASSESSMENT_FIELD_KEYS.collaborationScore)
    ),
    learnScore: getNumberValue(findFieldByKey(fields, GC_ASSESSMENT_FIELD_KEYS.learnScore)),
    behaviourScore: getNumberValue(findFieldByKey(fields, GC_ASSESSMENT_FIELD_KEYS.behaviourScore)),
  };

  return {
    personId,
    score,
    rawData,
    tallySubmissionId: submissionId,
  };
}

/**
 * SC assessment result data
 */
export interface SCAssessmentResult {
  applicationId: string;
  personId?: string;
  score: number;
  rawData: Record<string, unknown>;
  tallySubmissionId: string;
}

/**
 * Extract specialized competencies assessment data from webhook payload
 *
 * @param payload - The Tally webhook payload
 * @returns SC assessment data
 */
export function extractSCAssessmentData(payload: TallyWebhookPayload): SCAssessmentResult {
  const { fields, submissionId } = payload.data;

  const applicationIdField = findFieldByKey(fields, SC_ASSESSMENT_FIELD_KEYS.applicationId);
  const applicationId = getStringValue(applicationIdField);

  if (!applicationId) {
    throw new Error(
      'Application ID is required but missing from specialized assessment webhook'
    );
  }

  const personIdField = findFieldByKey(fields, SC_ASSESSMENT_FIELD_KEYS.personId);
  const personId = getStringValue(personIdField);

  const scoreField = findFieldByKey(fields, SC_ASSESSMENT_FIELD_KEYS.score);
  const score = getNumberValue(scoreField);

  if (score === undefined) {
    throw new Error('Score is required but missing from specialized assessment webhook');
  }

  return {
    applicationId,
    personId,
    score,
    rawData: {},
    tallySubmissionId: submissionId,
  };
}

/**
 * Validate that required fields are present in the payload
 *
 * @param payload - The Tally webhook payload
 * @param requiredKeys - Array of field key prefixes that are required
 * @returns Array of missing field keys
 */
export function validateRequiredFields(
  payload: TallyWebhookPayload,
  requiredKeys: string[]
): string[] {
  const { fields } = payload.data;
  const missing: string[] = [];

  for (const key of requiredKeys) {
    const field = findFieldByKey(fields, key);
    const value = getStringValue(field);
    if (!value) {
      missing.push(key);
    }
  }

  return missing;
}
