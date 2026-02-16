/**
 * Shared Validation and Sanitisation Utilities
 *
 * Centralises input validation and text sanitisation functions
 * used across API routes to prevent security bypasses and
 * maintain consistent handling of user-controlled input.
 */

/**
 * Validate that a value is a non-empty string.
 *
 * Prevents security bypasses where non-string truthy values
 * (e.g., arrays, numbers) pass loose `if (!x)` checks after `as string` casts.
 *
 * @param value - The value to validate
 * @param fieldName - Name of the field (for error messages)
 * @returns The validated string
 * @throws Error if value is not a non-empty string
 */
export function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new RequiredFieldError(fieldName);
  }
  return value;
}

/**
 * Error thrown when a required field is missing or has an invalid type
 */
export class RequiredFieldError extends Error {
  public readonly fieldName: string;

  constructor(fieldName: string) {
    super(`${fieldName} is required`);
    this.name = 'RequiredFieldError';
    this.fieldName = fieldName;
  }
}

/**
 * Sanitise text content to prevent injection when stored.
 *
 * Removes null bytes and truncates to a maximum length.
 *
 * @param text - The text to sanitise
 * @param maxLength - Maximum allowed length (default 5000)
 * @returns Sanitised text, or null if input is null/undefined
 */
export function sanitizeText(text: string | null | undefined, maxLength: number = 5000): string | null {
  if (text === null || text === undefined) return null;
  return text.replace(/\0/g, '').substring(0, maxLength);
}

/**
 * Allowed sort fields for application listing.
 *
 * Validates against an allowlist to prevent remote property injection
 * where user input is used as an object key.
 */
export const ALLOWED_SORT_FIELDS = ['createdAt', 'updatedAt', 'position'] as const;

export type AllowedSortField = (typeof ALLOWED_SORT_FIELDS)[number];

/**
 * Validate that a sort field is in the allowlist.
 *
 * @param field - The field name to validate
 * @returns The validated sort field
 * @throws Error if field is not in the allowlist
 */
export function validateSortField(field: string): AllowedSortField {
  if (!ALLOWED_SORT_FIELDS.includes(field as AllowedSortField)) {
    throw new Error(`Invalid sort field: ${field}. Allowed: ${ALLOWED_SORT_FIELDS.join(', ')}`);
  }
  return field as AllowedSortField;
}

/**
 * Validate that a sort order is strictly 'asc' or 'desc'.
 *
 * @param order - The sort order to validate
 * @returns The validated sort order
 */
export function validateSortOrder(order: string): 'asc' | 'desc' {
  if (order !== 'asc' && order !== 'desc') {
    return 'desc';
  }
  return order;
}
