/**
 * Tally Webhook Field Mapper
 *
 * Maps fields from Tally webhook payloads to our database schema.
 * Handles the extraction and transformation of form data.
 *
 * ## Field Resolution Strategy
 *
 * Tally field keys are volatile — they can change across form versions when
 * fields are re-created or forms are duplicated.  Labels, by contrast, are
 * stable identifiers set by the form creator (camelCase for hidden/calculated
 * fields, human-readable for visible fields).
 *
 * All extractors use **label-first lookup** via `findField()`:
 *   1. Try `findFieldByLabel` (case-insensitive exact match)
 *   2. Fall back to `findFieldByKey` (prefix match)
 *   3. Log a warning when only the key fallback matches — signals the label
 *      may have changed in Tally and the label map should be updated.
 *
 * ## Adding a New Field
 *
 * 1. Add the Tally field key to the relevant `*_FIELD_KEYS` map.
 * 2. Add the Tally field label to the matching `*_FIELD_LABELS` map.
 *    - Hidden/calculated fields use camelCase labels (e.g. `applicationId`).
 *    - Visible fields use the human-readable label from the Tally form.
 * 3. In the extractor function, use `find('fieldName')` (the local closure).
 * 4. Update the test fixtures in `tests/fixtures/tally-webhooks.ts`.
 */

import type { CreatePersonData } from '@/types/person';
import type { CreateApplicationData, AgreementData } from '@/types/application';

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
  label: string | null;
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

// ---------------------------------------------------------------------------
// Field key mappings (fallback — keys can shift across Tally form versions)
// ---------------------------------------------------------------------------

export const APPLICATION_FIELD_KEYS = {
  email: 'question_eaYYNE',
  firstName: 'question_qRkkYd',
  lastName: 'question_Q7OOxA',
  phoneNumber: 'question_97oo61',
  country: 'question_o2vAjV',
  portfolioLink: 'question_W8jjeP',
  educationLevel: 'question_a2aajE',
  position: 'question_KVavqX',
  resumeFile: 'question_7NppJ9',
  academicBackground: 'question_bW6622',
  previousExperience: 'question_kNkk0J',
  videoLink: 'question_Bx22LA',
  otherFile: 'question_97Md1Y',
  packageContents: 'question_6Zpp1O',
} as const;

export const APPLICATION_FIELD_LABELS = {
  email: 'Email',
  firstName: 'First Name',
  lastName: 'Last Name',
  phoneNumber: 'Phone',
  country: 'Country',
  portfolioLink: 'Portfolio',
  educationLevel: 'Education',
  position: 'Position',
  resumeFile: 'Resume',
  academicBackground: 'Academic Background',
  previousExperience: 'Previous Experience',
  videoLink: 'Video Introduction',
  otherFile: 'Other File',
  packageContents: 'Package Contents',
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

export const GC_ASSESSMENT_FIELD_KEYS = {
  personId: 'question_PzkEpx',
  name: 'question_Z2DVAV',
  score: 'question_Q7k02g',
  cultureScore: 'question_LdPQ1J',
  situationalScore: 'question_pLDlxP',
  digitalScore: 'question_J2ON0d',
} as const;

export const GC_ASSESSMENT_FIELD_LABELS = {
  personId: 'who',
  score: 'score',
  cultureScore: 'cultureScore',
  situationalScore: 'situationalScore',
  digitalScore: 'digitalScore',
} as const;

export const SC_ASSESSMENT_FIELD_KEYS = {
  applicationId: 'question_AppId',
  personId: 'question_PzkEpx',
  score: 'question_Score',
  specialisedCompetencyId: 'question_ScId',
} as const;

export const SC_ASSESSMENT_FIELD_LABELS = {
  applicationId: 'applicationId',
  personId: 'who',
  score: 'score',
  specialisedCompetencyId: 'scId',
} as const;

export const AGREEMENT_FIELD_KEYS = {
  applicationId: 'question_BGLBxe',
  legalFirstName: 'question_9Zx9jK',
  legalMiddleName: 'question_eryQWJ',
  legalLastName: 'question_WRQEVL',
  preferredFirstName: 'question_a4k5qW',
  preferredLastName: 'question_6K4jEo',
  profilePicture: 'question_7KjLr6',
  biography: 'question_8L2alk',
  dateOfBirth: 'question_DpbkGX',
  country: 'question_Xo9Jbe',
  privacyPolicy: 'question_QRjell',
  signature: 'question_P941qP',
  entityRepresented: 'question_po5y2y',
  serviceHours: 'question_LKV72z',
} as const;

export const AGREEMENT_FIELD_LABELS = {
  applicationId: 'applicationId',
  legalFirstName: 'First Legal Name',
  legalMiddleName: 'Middle Legal Name',
  legalLastName: 'Last Legal Name',
  preferredFirstName: 'First Preferred Name',
  preferredLastName: 'Last Preferred Name',
  profilePicture: 'Profile Picture',
  biography: 'Would you like to provide a short biography?',
  dateOfBirth: 'Date of Birth',
  country: 'Country',
  privacyPolicy: 'Privacy Policy Acceptance',
  signature: 'Internship Contract & Agreement Acceptance',
  entityRepresented: 'Entity Represented',
  serviceHours: 'Service Hours?',
} as const;

// ---------------------------------------------------------------------------
// Field lookup helpers
// ---------------------------------------------------------------------------

/**
 * Find a field by its key prefix
 *
 * Tally may append suffixes to keys for hidden fields.
 * This function finds fields that start with the given key.
 */
export function findFieldByKey(fields: TallyField[], keyPrefix: string): TallyField | undefined {
  return fields.find((f) => f.key.startsWith(keyPrefix));
}

/**
 * Find a field by its label (case-insensitive)
 *
 * Primary lookup method — labels are more stable than keys across
 * Tally form versions.
 */
export function findFieldByLabel(fields: TallyField[], label: string): TallyField | undefined {
  const lower = label.toLowerCase();
  return fields.find((f) => f.label != null && f.label.toLowerCase() === lower);
}

/**
 * Label-first field resolution with key fallback and drift warnings
 *
 * Tries `findFieldByLabel` first, then falls back to `findFieldByKey`.
 * When a field is only found by key (not label), logs a warning so
 * developers know the Tally form label may have changed.
 *
 * @param fields - Array of Tally fields from the webhook payload
 * @param label - Expected label (from a *_FIELD_LABELS map)
 * @param keyPrefix - Fallback key prefix (from a *_FIELD_KEYS map)
 * @param formContext - Form name for log messages (e.g. 'Application', 'GC')
 * @returns The matching field or undefined
 */
export function findField(
  fields: TallyField[],
  label: string,
  keyPrefix: string,
  formContext: string,
): TallyField | undefined {
  const byLabel = findFieldByLabel(fields, label);
  if (byLabel) return byLabel;

  const byKey = findFieldByKey(fields, keyPrefix);
  if (byKey) {
    console.warn(
      `[Tally Mapper] ${formContext}: Field "${label}" not found by label — ` +
      `fell back to key prefix "${keyPrefix}" (found key: "${byKey.key}", ` +
      `label: ${JSON.stringify(byKey.label)}). ` +
      `Update the label map if the Tally form label has changed.`
    );
    return byKey;
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Value extractors
// ---------------------------------------------------------------------------

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

export function getFileUrl(field: TallyField | undefined): string | undefined {
  if (!field || !Array.isArray(field.value) || field.value.length === 0) {
    return undefined;
  }

  const firstItem = field.value[0] as TallyFileUpload | TallyCheckboxValue;
  if ('url' in firstItem) {
    return firstItem.url;
  }

  return undefined;
}

export function isCheckboxSelected(field: TallyField | undefined, optionId: string): boolean {
  if (!field || !Array.isArray(field.value)) {
    return false;
  }

  return (field.value as TallyCheckboxValue[]).some(
    (v) => typeof v === 'object' && v !== null && v.id === optionId
  );
}

/**
 * Get dropdown/select value from a field
 *
 * Dropdown fields in Tally return an array of option IDs in the value field.
 * We need to look up the text from the options array.
 */
export function getDropdownValue(field: TallyField | undefined): string | undefined {
  if (!field || !Array.isArray(field.value) || field.value.length === 0) {
    return undefined;
  }

  const firstValue = field.value[0];
  if (firstValue && typeof firstValue === 'object' && 'text' in firstValue) {
    return (firstValue as TallyCheckboxValue).text;
  }

  if (field.options && field.options.length > 0) {
    const selectedIds = field.value as unknown as string[];
    const selectedOption = field.options.find((opt) => selectedIds.includes(opt.id));
    if (selectedOption) {
      return selectedOption.text;
    }
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Application form extractors
// ---------------------------------------------------------------------------

export function extractPersonData(payload: TallyWebhookPayload): CreatePersonData {
  const { fields, respondentId } = payload.data;
  const find = (name: keyof typeof APPLICATION_FIELD_LABELS) =>
    findField(fields, APPLICATION_FIELD_LABELS[name], APPLICATION_FIELD_KEYS[name], 'Application');

  const email = getStringValue(find('email'));
  if (!email) {
    throw new Error('Email is required but missing from webhook payload');
  }

  const firstName = getStringValue(find('firstName'));
  if (!firstName) {
    throw new Error('First name is required but missing from webhook payload');
  }

  const lastName = getStringValue(find('lastName'));
  if (!lastName) {
    throw new Error('Last name is required but missing from webhook payload');
  }

  const educationLevelField = find('educationLevel');
  const educationLevel = getDropdownValue(educationLevelField) || getStringValue(educationLevelField);

  return {
    email,
    firstName,
    lastName,
    phoneNumber: getStringValue(find('phoneNumber')),
    country: getStringValue(find('country')),
    portfolioLink: getStringValue(find('portfolioLink')),
    educationLevel,
    tallyRespondentId: respondentId,
  };
}

export function extractApplicationData(
  payload: TallyWebhookPayload,
  personId: string
): CreateApplicationData {
  const { fields, submissionId, responseId, formId } = payload.data;
  const find = (name: keyof typeof APPLICATION_FIELD_LABELS) =>
    findField(fields, APPLICATION_FIELD_LABELS[name], APPLICATION_FIELD_KEYS[name], 'Application');

  const position = getStringValue(find('position'));
  if (!position) {
    throw new Error('Position is required but missing from webhook payload');
  }

  const packageField = find('packageContents');

  return {
    personId,
    position,
    resumeUrl: getFileUrl(find('resumeFile')),
    academicBackground: getStringValue(find('academicBackground')),
    previousExperience: getStringValue(find('previousExperience')),
    videoLink: getStringValue(find('videoLink')),
    otherFileUrl: getFileUrl(find('otherFile')),
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

// ---------------------------------------------------------------------------
// GC assessment extractor
// ---------------------------------------------------------------------------

export interface GCSubscores {
  cultureScore?: number;
  situationalScore?: number;
  digitalScore?: number;
}

export interface GCRawData {
  subscores: GCSubscores;
  fields: TallyField[];
}

export interface GCAssessmentResult {
  personId: string;
  score: number;
  rawData: GCRawData;
  tallySubmissionId: string;
}

export function extractGCAssessmentData(payload: TallyWebhookPayload): GCAssessmentResult {
  const { fields, submissionId } = payload.data;
  const find = (name: keyof typeof GC_ASSESSMENT_FIELD_LABELS) =>
    findField(fields, GC_ASSESSMENT_FIELD_LABELS[name], GC_ASSESSMENT_FIELD_KEYS[name], 'GC');

  const personId = getStringValue(find('personId'));
  if (!personId) {
    throw new Error('Person ID (who) is required but missing from GC assessment webhook');
  }

  const score = getNumberValue(find('score'));
  if (score === undefined) {
    throw new Error('Score is required but missing from GC assessment webhook');
  }

  const subscores: GCSubscores = {
    cultureScore: getNumberValue(find('cultureScore')),
    situationalScore: getNumberValue(find('situationalScore')),
    digitalScore: getNumberValue(find('digitalScore')),
  };

  return {
    personId,
    score,
    rawData: {
      subscores,
      fields: payload.data.fields,
    },
    tallySubmissionId: submissionId,
  };
}

// ---------------------------------------------------------------------------
// SC assessment extractor
// ---------------------------------------------------------------------------

export interface SubmissionUrl {
  label: string;
  url: string;
  type: string;
}

export interface SCAssessmentResult {
  applicationId: string | undefined;
  personId?: string;
  specialisedCompetencyId?: string;
  score?: number;
  submissionUrls: SubmissionUrl[];
  rawData: Record<string, unknown>;
  tallySubmissionId: string;
}

/**
 * Extract file URLs from all file upload fields in the payload
 */
export function extractFileUrls(fields: TallyField[]): SubmissionUrl[] {
  const urls: SubmissionUrl[] = [];

  for (const field of fields) {
    if (!Array.isArray(field.value) || field.value.length === 0) continue;

    for (const item of field.value) {
      if (typeof item === 'object' && item !== null && 'url' in item) {
        const fileUpload = item as TallyFileUpload;
        urls.push({
          label: field.label ?? field.key,
          url: fileUpload.url,
          type: fileUpload.mimeType,
        });
      }
    }
  }

  return urls;
}

export function extractSCAssessmentData(payload: TallyWebhookPayload): SCAssessmentResult {
  const { fields, submissionId } = payload.data;
  const find = (name: keyof typeof SC_ASSESSMENT_FIELD_LABELS) =>
    findField(fields, SC_ASSESSMENT_FIELD_LABELS[name], SC_ASSESSMENT_FIELD_KEYS[name], 'SC');

  const applicationId = getStringValue(find('applicationId'));
  // applicationId is optional — SC forms often omit the hidden field.
  // When undefined the route handler resolves it via payload.data.respondentId.

  const personId = getStringValue(find('personId'));
  const score = getNumberValue(find('score'));
  const specialisedCompetencyId = getStringValue(find('specialisedCompetencyId'));
  const submissionUrls = extractFileUrls(fields);

  return {
    applicationId,
    personId,
    specialisedCompetencyId,
    score,
    submissionUrls,
    rawData: {
      fields: payload.data.fields,
    },
    tallySubmissionId: submissionId,
  };
}

// ---------------------------------------------------------------------------
// Agreement extractor
// ---------------------------------------------------------------------------

export interface AgreementSigningResult {
  applicationId: string;
  agreementData: AgreementData;
  tallySubmissionId: string;
}

export function extractAgreementData(payload: TallyWebhookPayload): AgreementSigningResult {
  const { fields, submissionId } = payload.data;
  const find = (name: keyof typeof AGREEMENT_FIELD_LABELS) =>
    findField(fields, AGREEMENT_FIELD_LABELS[name], AGREEMENT_FIELD_KEYS[name], 'Agreement');

  const applicationId = getStringValue(find('applicationId'));
  if (!applicationId) {
    throw new Error('Application ID is required but missing from agreement webhook');
  }

  const legalFirstName = getStringValue(find('legalFirstName'));
  if (!legalFirstName) {
    throw new Error('Legal first name is required but missing from agreement webhook');
  }

  const legalLastName = getStringValue(find('legalLastName'));
  if (!legalLastName) {
    throw new Error('Legal last name is required but missing from agreement webhook');
  }

  // Extract checkbox/boolean value for privacy policy
  const privacyPolicyField = find('privacyPolicy');
  let privacyPolicyAccepted: boolean | undefined;
  if (privacyPolicyField) {
    if (typeof privacyPolicyField.value === 'boolean') {
      privacyPolicyAccepted = privacyPolicyField.value;
    } else if (Array.isArray(privacyPolicyField.value) && privacyPolicyField.value.length > 0) {
      privacyPolicyAccepted = true;
    }
  }

  // Extract dropdown/select value for service hours
  const serviceHoursField = find('serviceHours');
  const serviceHours = getDropdownValue(serviceHoursField) || getStringValue(serviceHoursField);

  const agreementData: AgreementData = {
    applicationId,
    legalFirstName,
    legalMiddleName: getStringValue(find('legalMiddleName')),
    legalLastName,
    preferredFirstName: getStringValue(find('preferredFirstName')),
    preferredLastName: getStringValue(find('preferredLastName')),
    profilePictureUrl: getFileUrl(find('profilePicture')),
    biography: getStringValue(find('biography')),
    dateOfBirth: getStringValue(find('dateOfBirth')),
    country: getStringValue(find('country')),
    privacyPolicyAccepted,
    signatureUrl: getFileUrl(find('signature')),
    entityRepresented: getStringValue(find('entityRepresented')),
    serviceHours,
  };

  return {
    applicationId,
    agreementData,
    tallySubmissionId: submissionId,
  };
}

// ---------------------------------------------------------------------------
// Validation helper
// ---------------------------------------------------------------------------

/**
 * Validate that required fields are present in the payload
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
