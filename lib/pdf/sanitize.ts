/**
 * PDF Sanitization Utilities
 *
 * Security utilities for sanitizing content before rendering in PDFs.
 * Protects against XSS, content injection, and malicious data.
 *
 * SECURITY NOTES:
 * - All user-supplied data MUST be sanitized before PDF rendering
 * - URLs must be validated to prevent javascript: and data: injection
 * - Long content must be truncated to prevent memory exhaustion
 * - Special characters must be escaped for safe display
 */

/**
 * Maximum lengths for various content types to prevent memory exhaustion
 */
export const CONTENT_LIMITS = {
  /** Maximum characters for short text fields (names, titles) */
  SHORT_TEXT: 200,
  /** Maximum characters for medium text fields (emails, links) */
  MEDIUM_TEXT: 500,
  /** Maximum characters for long text fields (descriptions, notes) */
  LONG_TEXT: 5000,
  /** Maximum characters for activity/audit logs */
  ACTIVITY_TEXT: 10000,
  /** Maximum number of items in a list */
  LIST_ITEMS: 100,
  /** Maximum URL length */
  URL_LENGTH: 2048,
} as const;

/**
 * Allowed URL protocols for safe links
 */
const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:'] as const;

/**
 * Characters that should be escaped in text content
 */
const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

/**
 * Control characters that should be removed from content
 */
const CONTROL_CHAR_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/**
 * Unicode bidirectional override characters (potential injection vector)
 */
const BIDI_OVERRIDE_REGEX = /[\u202A-\u202E\u2066-\u2069]/g;

/**
 * Escape HTML entities in a string
 *
 * @param text - Text to escape
 * @returns Escaped text safe for display
 */
export function escapeHtml(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }
  return text.replace(/[&<>"'/]/g, (char) => ESCAPE_MAP[char] || char);
}

/**
 * Remove control characters and bidirectional overrides
 *
 * @param text - Text to clean
 * @returns Cleaned text without dangerous characters
 */
export function removeControlCharacters(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }
  return text.replace(CONTROL_CHAR_REGEX, '').replace(BIDI_OVERRIDE_REGEX, '');
}

/**
 * Normalize whitespace in text (collapse multiple spaces, trim)
 *
 * @param text - Text to normalize
 * @returns Normalized text
 */
export function normalizeWhitespace(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Truncate text to a maximum length with ellipsis
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number): string {
  if (typeof text !== 'string') {
    return '';
  }
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Validate and sanitize a URL
 *
 * @param url - URL to validate
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const trimmedUrl = url.trim();

  // Check length limit
  if (trimmedUrl.length > CONTENT_LIMITS.URL_LENGTH) {
    return '';
  }

  try {
    const parsed = new URL(trimmedUrl);

    // Check for allowed protocols only
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol as (typeof ALLOWED_PROTOCOLS)[number])) {
      return '';
    }

    // Reconstruct URL to ensure it's properly encoded
    return parsed.toString();
  } catch {
    // Invalid URL format
    return '';
  }
}

/**
 * Validate email format
 *
 * @param email - Email to validate
 * @returns Boolean indicating if email is valid
 */
export function isValidEmail(email: string): boolean {
  if (typeof email !== 'string') {
    return false;
  }

  // Basic email validation (more permissive than strict RFC 5322)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= CONTENT_LIMITS.MEDIUM_TEXT;
}

/**
 * Sanitize an email address for display
 *
 * @param email - Email to sanitize
 * @returns Sanitized email or empty string
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (!email || typeof email !== 'string') {
    return '';
  }

  const cleaned = removeControlCharacters(email.trim().toLowerCase());

  if (!isValidEmail(cleaned)) {
    return '';
  }

  return escapeHtml(cleaned);
}

/**
 * Sanitize a short text field (names, titles, etc.)
 *
 * @param text - Text to sanitize
 * @returns Sanitized text
 */
export function sanitizeShortText(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let cleaned = removeControlCharacters(text);
  cleaned = normalizeWhitespace(cleaned);
  cleaned = truncateText(cleaned, CONTENT_LIMITS.SHORT_TEXT);
  cleaned = escapeHtml(cleaned);

  return cleaned;
}

/**
 * Sanitize a medium text field (descriptions, comments)
 *
 * @param text - Text to sanitize
 * @returns Sanitized text
 */
export function sanitizeMediumText(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let cleaned = removeControlCharacters(text);
  cleaned = cleaned.trim();
  cleaned = truncateText(cleaned, CONTENT_LIMITS.MEDIUM_TEXT);
  cleaned = escapeHtml(cleaned);

  return cleaned;
}

/**
 * Sanitize a long text field (notes, experience, background)
 * Preserves newlines for multi-paragraph content
 *
 * @param text - Text to sanitize
 * @returns Sanitized text with preserved line breaks
 */
export function sanitizeLongText(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let cleaned = removeControlCharacters(text);
  // Normalize line breaks
  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Remove excessive blank lines (more than 2 consecutive)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.trim();
  cleaned = truncateText(cleaned, CONTENT_LIMITS.LONG_TEXT);
  cleaned = escapeHtml(cleaned);

  return cleaned;
}

/**
 * Sanitize a date for display
 *
 * @param date - Date to sanitize
 * @returns Formatted date string or empty string
 */
export function sanitizeDate(date: Date | string | null | undefined): string {
  if (!date) {
    return '';
  }

  try {
    const parsed = date instanceof Date ? date : new Date(date);

    // Check for invalid date
    if (isNaN(parsed.getTime())) {
      return '';
    }

    // Ensure date is within reasonable range (1900-2100)
    const year = parsed.getFullYear();
    if (year < 1900 || year > 2100) {
      return '';
    }

    return parsed.toISOString();
  } catch {
    return '';
  }
}

/**
 * Format a date for display in PDFs
 *
 * Uses European convention for the date portion (D MMMM YYYY) and 24-hour time
 * for full timestamps. Locale is set to `en-GB` to ensure consistent ordering.
 *
 * Examples:
 * - Date only: 21 January 2026
 * - Full timestamp: 21 January 2026, 14:30 GMT
 *
 * @param date - Date to format
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  const sanitized = sanitizeDate(date);
  if (!sanitized) {
    return 'N/A';
  }

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
    hour12: false,
  };

  // Use en-GB for D MMMM YYYY ordering and full month names (e.g., 21 January 2026)
  return new Date(sanitized).toLocaleString('en-GB', options ?? defaultOptions);
}

/**
 * Format a date for display (date only, no time)
 *
 * Formats as DD MMMM YYYY (e.g., 21 January 2026)
 *
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDateOnly(date: Date | string | null | undefined): string {
  return formatDate(date, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Sanitize a number for display
 *
 * @param value - Number to sanitize
 * @param decimals - Number of decimal places
 * @returns Formatted number string or 'N/A'
 */
export function sanitizeNumber(
  value: number | string | null | undefined,
  decimals: number = 0
): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (typeof num !== 'number' || isNaN(num) || !isFinite(num)) {
    return 'N/A';
  }

  return num.toFixed(decimals);
}

/**
 * Sanitize a boolean for display
 *
 * @param value - Boolean to sanitize
 * @param trueLabel - Label for true value
 * @param falseLabel - Label for false value
 * @returns Display string
 */
export function sanitizeBoolean(
  value: boolean | null | undefined,
  trueLabel: string = 'Yes',
  falseLabel: string = 'No'
): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  return value ? trueLabel : falseLabel;
}

/**
 * Sanitize an IP address for display
 *
 * @param ip - IP address to sanitize
 * @returns Sanitized IP or masked placeholder
 */
export function sanitizeIpAddress(ip: string | null | undefined): string {
  if (!ip || typeof ip !== 'string') {
    return '';
  }

  // Basic IPv4 validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  // Basic IPv6 validation (simplified)
  const ipv6Regex = /^[a-fA-F0-9:]+$/;

  const trimmed = ip.trim();

  if (ipv4Regex.test(trimmed) || ipv6Regex.test(trimmed)) {
    return escapeHtml(trimmed);
  }

  return '';
}

/**
 * Sanitize an array of items, limiting count
 *
 * @param items - Array to sanitize
 * @param sanitizer - Function to sanitize each item
 * @param maxItems - Maximum number of items to include
 * @returns Sanitized array
 */
export function sanitizeArray<T, U>(
  items: T[] | null | undefined,
  sanitizer: (item: T) => U,
  maxItems: number = CONTENT_LIMITS.LIST_ITEMS
): U[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.slice(0, maxItems).map(sanitizer);
}

/**
 * Sanitize JSON data for display
 *
 * @param data - JSON data to sanitize
 * @returns Sanitized JSON string or empty string
 */
export function sanitizeJson(data: unknown): string {
  if (data === null || data === undefined) {
    return '';
  }

  try {
    const stringified = JSON.stringify(data, null, 2);
    // Limit JSON output size
    const truncated = truncateText(stringified, CONTENT_LIMITS.ACTIVITY_TEXT);
    return escapeHtml(truncated);
  } catch {
    return '';
  }
}

/**
 * Comprehensive data sanitizer for PDF generation
 *
 * Creates a safe copy of data with all fields sanitized
 */
export interface SanitizedApplicationData {
  person: {
    fullName: string;
    firstName: string;
    lastName: string;
    email: string;
    secondaryEmail: string;
    phoneNumber: string;
    location: string;
    portfolioLink: string;
    educationLevel: string;
    generalCompetenciesScore: string;
    generalCompetenciesCompleted: string;
    generalCompetenciesPassedAt: string;
  };
  application: {
    id: string;
    position: string;
    currentStage: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    resumeUrl: string;
    academicBackground: string;
    previousExperience: string;
    videoLink: string;
    otherFileUrl: string;
    missingFields: string[];
  };
  assessments: Array<{
    type: string;
    score: string;
    passed: string;
    threshold: string;
    completedAt: string;
  }>;
  interviews: Array<{
    interviewer: string;
    schedulingLink: string;
    scheduledAt: string;
    completedAt: string;
    outcome: string;
    notes: string;
  }>;
  decisions: Array<{
    decision: string;
    reason: string;
    notes: string;
    decidedBy: string;
    decidedAt: string;
  }>;
  generatedAt: string;
}

/**
 * Type for audit log sanitization
 */
export interface SanitizedAuditLog {
  action: string;
  actionType: string;
  details: string;
  user: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

/**
 * Sanitize a user agent string (truncate and escape)
 *
 * @param userAgent - User agent string
 * @returns Sanitized user agent
 */
export function sanitizeUserAgent(userAgent: string | null | undefined): string {
  if (!userAgent || typeof userAgent !== 'string') {
    return '';
  }

  let cleaned = removeControlCharacters(userAgent);
  cleaned = truncateText(cleaned, CONTENT_LIMITS.MEDIUM_TEXT);
  cleaned = escapeHtml(cleaned);

  return cleaned;
}

/**
 * Validate that a string is a valid UUID
 *
 * @param id - String to validate
 * @returns Boolean indicating if valid UUID
 */
export function isValidUuid(id: string | null | undefined): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Sanitize a UUID for use in queries/display
 *
 * @param id - UUID to sanitize
 * @returns Sanitized UUID or empty string
 */
export function sanitizeUuid(id: string | null | undefined): string {
  if (!isValidUuid(id)) {
    return '';
  }
  return id!.toLowerCase();
}

// =============================================================================
// PDF-SPECIFIC SANITIZATION
// =============================================================================
// React-PDF renders plain text, NOT HTML. Therefore, we should NOT use HTML
// entity escaping for PDF content. The escapeHtml function converts characters
// like ' to &#x27; which would be displayed literally in the PDF.
// =============================================================================

/**
 * Sanitize short text for PDF rendering (no HTML escaping)
 *
 * @param text - Text to sanitize
 * @returns Sanitized text safe for PDF
 */
export function sanitizeShortTextForPdf(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let cleaned = removeControlCharacters(text);
  cleaned = normalizeWhitespace(cleaned);
  cleaned = truncateText(cleaned, CONTENT_LIMITS.SHORT_TEXT);
  // Do NOT escape HTML - react-pdf renders plain text

  return cleaned;
}

/**
 * Sanitize medium text for PDF rendering (no HTML escaping)
 *
 * @param text - Text to sanitize
 * @returns Sanitized text safe for PDF
 */
export function sanitizeMediumTextForPdf(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let cleaned = removeControlCharacters(text);
  cleaned = cleaned.trim();
  cleaned = truncateText(cleaned, CONTENT_LIMITS.MEDIUM_TEXT);
  // Do NOT escape HTML - react-pdf renders plain text

  return cleaned;
}

/**
 * Sanitize long text for PDF rendering (no HTML escaping)
 * Preserves newlines for multi-paragraph content
 *
 * @param text - Text to sanitize
 * @returns Sanitized text safe for PDF with preserved line breaks
 */
export function sanitizeLongTextForPdf(text: string | null | undefined): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let cleaned = removeControlCharacters(text);
  // Normalize line breaks
  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Remove excessive blank lines (more than 2 consecutive)
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.trim();
  cleaned = truncateText(cleaned, CONTENT_LIMITS.LONG_TEXT);
  // Do NOT escape HTML - react-pdf renders plain text

  return cleaned;
}

/**
 * Sanitize email for PDF rendering (no HTML escaping)
 *
 * @param email - Email to sanitize
 * @returns Sanitized email safe for PDF
 */
export function sanitizeEmailForPdf(email: string | null | undefined): string {
  if (!email || typeof email !== 'string') {
    return '';
  }

  const cleaned = removeControlCharacters(email.trim().toLowerCase());

  if (!isValidEmail(cleaned)) {
    return '';
  }

  // Do NOT escape HTML - react-pdf renders plain text
  return cleaned;
}

/**
 * Sanitize JSON for PDF rendering (no HTML escaping)
 *
 * @param data - JSON data to sanitize
 * @returns Sanitized JSON string safe for PDF
 */
export function sanitizeJsonForPdf(data: unknown): string {
  if (data === null || data === undefined) {
    return '';
  }

  try {
    const stringified = JSON.stringify(data, null, 2);
    // Limit JSON output size
    const truncated = truncateText(stringified, CONTENT_LIMITS.ACTIVITY_TEXT);
    // Do NOT escape HTML - react-pdf renders plain text
    return truncated;
  } catch {
    return '';
  }
}

/**
 * Sanitize user agent for PDF rendering (no HTML escaping)
 *
 * @param userAgent - User agent string
 * @returns Sanitized user agent safe for PDF
 */
export function sanitizeUserAgentForPdf(userAgent: string | null | undefined): string {
  if (!userAgent || typeof userAgent !== 'string') {
    return '';
  }

  let cleaned = removeControlCharacters(userAgent);
  cleaned = truncateText(cleaned, CONTENT_LIMITS.MEDIUM_TEXT);
  // Do NOT escape HTML - react-pdf renders plain text

  return cleaned;
}
