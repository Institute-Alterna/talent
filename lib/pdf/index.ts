/**
 * PDF Generation Module
 *
 * Provides PDF generation capabilities for candidate reports and audit logs.
 *
 * USAGE:
 * ```typescript
 * import { generateCandidateReportPdf, generateAuditReportPdf } from '@/lib/pdf';
 *
 * // Generate candidate report
 * const result = await generateCandidateReportPdf(applicationId);
 *
 * // Generate audit report
 * const auditResult = await generateAuditReportPdf('application', applicationId, 'John Doe');
 * ```
 *
 * SECURITY:
 * - All user data is sanitized before PDF generation
 * - URLs are validated to prevent protocol injection
 * - Content is truncated to prevent memory exhaustion
 */

// Main generator functions
export {
  generateCandidateReportPdf,
  generateAuditReportPdf,
  canGeneratePdf,
  sanitizeApplicationData,
  sanitizeAuditLogs,
  PdfGenerationError,
  type GeneratePdfOptions,
  type GeneratePdfResult,
  type SanitizedApplicationData,
  type SanitizedAuditLog,
} from './generator';

// Sanitization utilities
export {
  escapeHtml,
  removeControlCharacters,
  normalizeWhitespace,
  truncateText,
  sanitizeUrl,
  sanitizeEmail,
  sanitizeShortText,
  sanitizeMediumText,
  sanitizeLongText,
  sanitizeDate,
  formatDate,
  formatDateOnly,
  sanitizeNumber,
  sanitizeBoolean,
  sanitizeIpAddress,
  sanitizeUserAgent,
  sanitizeArray,
  sanitizeJson,
  sanitizeUuid,
  isValidEmail,
  isValidUuid,
  CONTENT_LIMITS,
} from './sanitize';

// Configuration (for customization)
export {
  pdfColors,
  pdfFonts,
  pdfFontSizes,
  pdfSpacing,
  pdfPageConfig,
  pdfLabels,
  pdfSections,
  getStatusColor,
  getStageColor,
  getResultColor,
  getOutcomeColor,
  type PDFColors,
  type PDFSpacing,
  type PDFFontSizes,
  type PDFLabels,
  type PDFSections,
} from './config';
