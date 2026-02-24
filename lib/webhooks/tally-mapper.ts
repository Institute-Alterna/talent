/**
 * Tally Webhook Field Mapper
 *
 * Maps fields from Tally webhook payloads to our database schema.
 * Handles the extraction and transformation of form data.
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
 *
 * These match the real Tally GCQ form field key prefixes.
 * Tally may append UUIDs as suffixes to hidden/calculated keys.
 */
export const GC_ASSESSMENT_FIELD_KEYS = {
  personId: 'question_PzkEpx', // Hidden field with person ID (who)
  name: 'question_Z2DVAV', // Hidden field for verification
  score: 'question_Q7k02g', // Calculated composite score

  // Section scores (calculated fields)
  cultureScore: 'question_LdPQ1J',
  situationalScore: 'question_pLDlxP',
  digitalScore: 'question_J2ON0d',
} as const;

/**
 * Field key mappings for specialized competencies assessment
 */
export const SC_ASSESSMENT_FIELD_KEYS = {
  applicationId: 'question_AppId', // Hidden field with application ID
  personId: 'question_PzkEpx', // Hidden field with person ID (fallback)
  score: 'question_Score', // Calculated total score (optional)
  specialisedCompetencyId: 'question_ScId', // Hidden field with SC definition ID
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
 * Get dropdown/select value from a field
 *
 * Dropdown fields in Tally return an array of option IDs in the value field.
 * We need to look up the text from the options array.
 *
 * @param field - The Tally dropdown field
 * @returns The selected option text or undefined
 */
export function getDropdownValue(field: TallyField | undefined): string | undefined {
  if (!field || !Array.isArray(field.value) || field.value.length === 0) {
    return undefined;
  }

  // Check if value is already TallyCheckboxValue[] (has text directly)
  const firstValue = field.value[0];
  if (firstValue && typeof firstValue === 'object' && 'text' in firstValue) {
    return (firstValue as TallyCheckboxValue).text;
  }

  // Otherwise, value is array of option IDs - look up text from options
  if (field.options && field.options.length > 0) {
    const selectedIds = field.value as unknown as string[];
    const selectedOption = field.options.find((opt) => selectedIds.includes(opt.id));
    if (selectedOption) {
      return selectedOption.text;
    }
  }

  return undefined;
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

  // Education level is a dropdown, so we need to extract the text from options
  const educationLevelField = findFieldByKey(fields, APPLICATION_FIELD_KEYS.educationLevel);
  const educationLevel = getDropdownValue(educationLevelField) || getStringValue(educationLevelField);

  return {
    email,
    firstName,
    lastName,
    phoneNumber: getStringValue(findFieldByKey(fields, APPLICATION_FIELD_KEYS.phoneNumber)),
    country: getStringValue(findFieldByKey(fields, APPLICATION_FIELD_KEYS.country)),
    portfolioLink: getStringValue(findFieldByKey(fields, APPLICATION_FIELD_KEYS.portfolioLink)),
    educationLevel,
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
 * Sub-scores from the GC assessment
 *
 * Matches the three calculated section scores in the Tally GCQ form:
 * - cultureScore: culture-fit questions
 * - situationalScore: situational-judgement questions
 * - digitalScore: digital-literacy questions
 */
export interface GCSubscores {
  cultureScore?: number;
  situationalScore?: number;
  digitalScore?: number;
}

/**
 * GC assessment raw data — new format includes full Tally fields.
 * Consumers must handle both old (flat sub-scores) and new format.
 */
export interface GCRawData {
  subscores: GCSubscores;
  fields: TallyField[];
}

/**
 * GC assessment result data
 */
export interface GCAssessmentResult {
  personId: string;
  score: number;
  rawData: GCRawData;
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
  const subscores: GCSubscores = {
    cultureScore: getNumberValue(
      findFieldByKey(fields, GC_ASSESSMENT_FIELD_KEYS.cultureScore)
    ),
    situationalScore: getNumberValue(
      findFieldByKey(fields, GC_ASSESSMENT_FIELD_KEYS.situationalScore)
    ),
    digitalScore: getNumberValue(
      findFieldByKey(fields, GC_ASSESSMENT_FIELD_KEYS.digitalScore)
    ),
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

/**
 * Submission URL extracted from a Tally file field
 */
export interface SubmissionUrl {
  label: string;
  url: string;
  type: string;
}

/**
 * SC assessment result data
 */
export interface SCAssessmentResult {
  applicationId: string;
  personId?: string;
  specialisedCompetencyId?: string;
  score?: number;
  submissionUrls: SubmissionUrl[];
  rawData: Record<string, unknown>;
  tallySubmissionId: string;
}

/**
 * Extract file URLs from all file upload fields in the payload
 *
 * @param fields - Array of Tally fields
 * @returns Array of submission URL objects
 */
export function extractFileUrls(fields: TallyField[]): SubmissionUrl[] {
  const urls: SubmissionUrl[] = [];

  for (const field of fields) {
    if (!Array.isArray(field.value) || field.value.length === 0) continue;

    for (const item of field.value) {
      if (typeof item === 'object' && item !== null && 'url' in item) {
        const fileUpload = item as TallyFileUpload;
        urls.push({
          label: field.label,
          url: fileUpload.url,
          type: fileUpload.mimeType,
        });
      }
    }
  }

  return urls;
}

/**
 * Extract specialized competencies assessment data from webhook payload
 *
 * Score extraction is optional — SC assessments are reviewed by admins.
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

  // Score is optional — admin reviews SC submissions manually
  const scoreField = findFieldByKey(fields, SC_ASSESSMENT_FIELD_KEYS.score);
  const score = getNumberValue(scoreField);

  // Extract specialised competency definition ID (optional)
  const scIdField = findFieldByKey(fields, SC_ASSESSMENT_FIELD_KEYS.specialisedCompetencyId);
  const specialisedCompetencyId = getStringValue(scIdField);

  // Extract all file URLs from the submission
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

/**
 * Field key mappings for agreement signing form
 */
export const AGREEMENT_FIELD_KEYS = {
  applicationId: 'question_14Oda4',
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

/**
 * Agreement signing result data
 */
export interface AgreementSigningResult {
  applicationId: string;
  agreementData: AgreementData;
  tallySubmissionId: string;
}

/**
 * Extract agreement signing data from webhook payload
 *
 * @param payload - The Tally webhook payload
 * @returns Agreement signing data
 */
export function extractAgreementData(payload: TallyWebhookPayload): AgreementSigningResult {
  const { fields, submissionId } = payload.data;

  const applicationIdField = findFieldByKey(fields, AGREEMENT_FIELD_KEYS.applicationId);
  const applicationId = getStringValue(applicationIdField);

  if (!applicationId) {
    throw new Error('Application ID (Internal ID) is required but missing from agreement webhook');
  }

  const legalFirstNameField = findFieldByKey(fields, AGREEMENT_FIELD_KEYS.legalFirstName);
  const legalFirstName = getStringValue(legalFirstNameField);

  if (!legalFirstName) {
    throw new Error('Legal first name is required but missing from agreement webhook');
  }

  const legalLastNameField = findFieldByKey(fields, AGREEMENT_FIELD_KEYS.legalLastName);
  const legalLastName = getStringValue(legalLastNameField);

  if (!legalLastName) {
    throw new Error('Legal last name is required but missing from agreement webhook');
  }

  // Extract checkbox/boolean value for privacy policy
  const privacyPolicyField = findFieldByKey(fields, AGREEMENT_FIELD_KEYS.privacyPolicy);
  let privacyPolicyAccepted: boolean | undefined;
  if (privacyPolicyField) {
    if (typeof privacyPolicyField.value === 'boolean') {
      privacyPolicyAccepted = privacyPolicyField.value;
    } else if (Array.isArray(privacyPolicyField.value) && privacyPolicyField.value.length > 0) {
      privacyPolicyAccepted = true;
    }
  }

  // Extract dropdown/select value for service hours
  const serviceHoursField = findFieldByKey(fields, AGREEMENT_FIELD_KEYS.serviceHours);
  const serviceHours = getDropdownValue(serviceHoursField) || getStringValue(serviceHoursField);

  const agreementData: AgreementData = {
    applicationId,
    legalFirstName,
    legalMiddleName: getStringValue(findFieldByKey(fields, AGREEMENT_FIELD_KEYS.legalMiddleName)),
    legalLastName,
    preferredFirstName: getStringValue(findFieldByKey(fields, AGREEMENT_FIELD_KEYS.preferredFirstName)),
    preferredLastName: getStringValue(findFieldByKey(fields, AGREEMENT_FIELD_KEYS.preferredLastName)),
    profilePictureUrl: getFileUrl(findFieldByKey(fields, AGREEMENT_FIELD_KEYS.profilePicture)),
    biography: getStringValue(findFieldByKey(fields, AGREEMENT_FIELD_KEYS.biography)),
    dateOfBirth: getStringValue(findFieldByKey(fields, AGREEMENT_FIELD_KEYS.dateOfBirth)),
    country: getStringValue(findFieldByKey(fields, AGREEMENT_FIELD_KEYS.country)),
    privacyPolicyAccepted,
    signatureUrl: getFileUrl(findFieldByKey(fields, AGREEMENT_FIELD_KEYS.signature)),
    entityRepresented: getStringValue(findFieldByKey(fields, AGREEMENT_FIELD_KEYS.entityRepresented)),
    serviceHours,
  };

  return {
    applicationId,
    agreementData,
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
