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
  type SCAssessmentResult,
  // Field key mappings
  APPLICATION_FIELD_KEYS,
  PACKAGE_CHECKBOX_IDS,
  GC_ASSESSMENT_FIELD_KEYS,
  SC_ASSESSMENT_FIELD_KEYS,
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
  validateRequiredFields,
} from './tally-mapper';

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
