/**
 * Webhook Utilities
 *
 * Main exports for webhook handling:
 * - Verification (signature, IP whitelist)
 * - Field mapping (Tally → database)
 * - Rate limiting
 */

// Verification utilities
export {
  verifyWebhookSecret,
  verifyIP,
  getClientIP,
  verifyWebhook,
  type VerificationResult,
} from './verify';

// Tally field mapping
export {
  // Types
  type TallyWebhookPayload,
  type TallyField,
  type TallyFieldValue,
  type TallyFileUpload,
  type TallyCheckboxValue,
  type GCAssessmentResult,
  type GCSubscores,
  type GCRawData,
  type SCAssessmentResult,
  type AgreementSigningResult,
  // Field key mappings
  APPLICATION_FIELD_KEYS,
  PACKAGE_CHECKBOX_IDS,
  GC_ASSESSMENT_FIELD_KEYS,
  SC_ASSESSMENT_FIELD_KEYS,
  AGREEMENT_FIELD_KEYS,
  // Extraction functions
  findFieldByKey,
  getStringValue,
  getNumberValue,
  getFileUrl,
  isCheckboxSelected,
  extractPersonData,
  extractApplicationData,
  extractGCAssessmentData,
  extractSCAssessmentData,
  extractAgreementData,
  validateRequiredFields,
} from './tally-mapper';

// Shared webhook helpers
export {
  webhookErrorResponse,
  webhookOptionsResponse,
  parseAndVerifyWebhook,
  type WebhookParseResult,
} from './helpers';

// Rate limiting
export {
  checkRateLimit,
  createRateLimiter,
  webhookRateLimiter,
  strictRateLimiter,
  getRateLimitHeaders,
  resetRateLimit,
  clearAllRateLimits,
  type RateLimitConfig,
  type RateLimitResult,
} from './rate-limiter';
