/**
 * Utility Functions Tests
 *
 * Unit tests for utility functions in lib/utils.ts
 *
 * Unit tests are great for testing pure functions - functions that:
 * - Always return the same output for the same input
 * - Don't have side effects (don't modify external state)
 * - Don't depend on external state
 *
 * The cn() function is a utility for merging Tailwind CSS classes.
 * It combines clsx (for conditional classes) with tailwind-merge
 * (for resolving conflicting Tailwind classes).
 */

import { cn, isValidUUID, isValidURL, formatDate, formatDateTime, formatDateShort } from '@/lib/utils';

describe('cn (className utility)', () => {
  /**
   * Test: Basic class merging
   *
   * The simplest use case - joining multiple class strings together.
   */
  it('merges multiple class strings', () => {
    const result = cn('px-4', 'py-2', 'text-white');
    expect(result).toBe('px-4 py-2 text-white');
  });

  /**
   * Test: Handles undefined and null values
   *
   * Often we pass conditional classes that might be undefined.
   * cn() should handle these gracefully.
   */
  it('handles undefined and null values', () => {
    const result = cn('px-4', undefined, null, 'py-2');
    expect(result).toBe('px-4 py-2');
  });

  /**
   * Test: Handles boolean false values (conditional classes)
   *
   * A common pattern: cn('base-class', isActive && 'active-class')
   * When isActive is false, the result is false, which should be ignored.
   */
  it('handles false values for conditional classes', () => {
    const isActive = false;
    const result = cn('btn', isActive && 'btn-active');
    expect(result).toBe('btn');
  });

  /**
   * Test: Resolves conflicting Tailwind classes
   *
   * This is where tailwind-merge shines. When you have conflicting
   * classes (like px-4 and px-2), it keeps the last one.
   */
  it('resolves conflicting Tailwind classes (keeps last)', () => {
    const result = cn('px-4', 'px-2');
    expect(result).toBe('px-2');
  });

  /**
   * Test: Handles object syntax for conditional classes
   *
   * clsx supports object syntax: { 'class-name': boolean }
   */
  it('handles object syntax for conditional classes', () => {
    const result = cn('base', { active: true, disabled: false });
    expect(result).toBe('base active');
  });

  /**
   * Test: Handles array syntax
   *
   * clsx also supports arrays of classes
   */
  it('handles array syntax', () => {
    const result = cn(['px-4', 'py-2'], 'text-white');
    expect(result).toBe('px-4 py-2 text-white');
  });

  /**
   * Test: Returns empty string for no classes
   */
  it('returns empty string when no classes provided', () => {
    const result = cn();
    expect(result).toBe('');
  });

  /**
   * Test: Complex Tailwind class conflict resolution
   *
   * More complex example with multiple conflicting properties
   */
  it('resolves complex Tailwind conflicts', () => {
    // Base styles that might be overridden by variants
    const baseStyles = 'p-4 text-sm bg-white text-black';
    const variantStyles = 'p-2 bg-blue-500 text-white';

    const result = cn(baseStyles, variantStyles);

    // Should have the variant padding, background, and text color
    expect(result).toContain('p-2');
    expect(result).toContain('bg-blue-500');
    expect(result).toContain('text-white');

    // Should NOT have the base padding, background, or text color
    expect(result).not.toContain('p-4');
    expect(result).not.toContain('bg-white');
    expect(result).not.toContain('text-black');

    // text-sm should still be there (not conflicting)
    expect(result).toContain('text-sm');
  });
});

describe('isValidUUID', () => {
  /**
   * Test: Validates correct UUID v4 format
   */
  it('returns true for valid UUID v4', () => {
    expect(isValidUUID('123e4567-e89b-42d3-a456-426614174000')).toBe(true);
    expect(isValidUUID('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  /**
   * Test: Handles uppercase UUIDs
   */
  it('returns true for uppercase UUID v4', () => {
    expect(isValidUUID('123E4567-E89B-42D3-A456-426614174000')).toBe(true);
    expect(isValidUUID('F47AC10B-58CC-4372-A567-0E02B2C3D479')).toBe(true);
  });

  /**
   * Test: Rejects invalid UUIDs
   */
  it('returns false for invalid UUID formats', () => {
    expect(isValidUUID('')).toBe(false);
    expect(isValidUUID('not-a-uuid')).toBe(false);
    expect(isValidUUID('123')).toBe(false);
    expect(isValidUUID('123e4567-e89b-42d3-a456')).toBe(false); // too short
    expect(isValidUUID('123e4567-e89b-42d3-a456-426614174000-extra')).toBe(false); // too long
  });

  /**
   * Test: Rejects UUIDs without version 4 identifier
   */
  it('returns false for non-v4 UUIDs', () => {
    // UUID v1 (time-based) - first digit of third segment is 1, not 4
    expect(isValidUUID('6fa459ea-ee8a-1a98-acdc-0242ac120002')).toBe(false);
    // UUID v3 (MD5 hash) - first digit of third segment is 3, not 4
    expect(isValidUUID('6fa459ea-ee8a-3a98-acdc-0242ac120002')).toBe(false);
  });

  /**
   * Test: Rejects malformed UUIDs
   */
  it('returns false for malformed UUIDs', () => {
    expect(isValidUUID('123e4567e89b42d3a456426614174000')).toBe(false); // missing hyphens
    expect(isValidUUID('123e4567-e89b-42d3-a456-42661417400g')).toBe(false); // invalid char 'g'
    expect(isValidUUID('   ')).toBe(false); // whitespace
  });
});

describe('isValidURL', () => {
  /**
   * Test: Validates HTTP URLs
   */
  it('returns true for valid HTTP URLs', () => {
    expect(isValidURL('http://example.com')).toBe(true);
    expect(isValidURL('http://example.com/path')).toBe(true);
    expect(isValidURL('http://example.com/path?query=1')).toBe(true);
    expect(isValidURL('http://localhost:3000')).toBe(true);
  });

  /**
   * Test: Validates HTTPS URLs
   */
  it('returns true for valid HTTPS URLs', () => {
    expect(isValidURL('https://example.com')).toBe(true);
    expect(isValidURL('https://calendly.com/my-link')).toBe(true);
    expect(isValidURL('https://cal.com/user/meeting')).toBe(true);
    expect(isValidURL('https://www.example.com/path?query=value#hash')).toBe(true);
  });

  /**
   * Test: Rejects invalid URLs
   */
  it('returns false for invalid URLs', () => {
    expect(isValidURL('')).toBe(false);
    expect(isValidURL('not-a-url')).toBe(false);
    expect(isValidURL('example.com')).toBe(false); // missing protocol
    expect(isValidURL('www.example.com')).toBe(false); // missing protocol
  });

  /**
   * Test: Rejects non-HTTP protocols for security
   */
  it('returns false for non-HTTP protocols', () => {
    expect(isValidURL('ftp://example.com')).toBe(false);
    expect(isValidURL('file:///path/to/file')).toBe(false);
    expect(isValidURL('mailto:test@example.com')).toBe(false);
    expect(isValidURL('javascript:alert(1)')).toBe(false);
  });
});

describe('formatDate', () => {
  /**
   * Test: Formats Date objects
   */
  it('formats a valid Date object', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    const result = formatDate(date);
    expect(result).toMatch(/15\s+January\s+2024/);
  });

  /**
   * Test: Formats ISO date strings
   */
  it('formats a valid ISO date string', () => {
    const result = formatDate('2024-03-20T15:45:00Z');
    expect(result).toMatch(/20\s+March\s+2024/);
  });

  /**
   * Test: Handles null values
   */
  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('');
  });

  /**
   * Test: Handles undefined values
   */
  it('returns empty string for undefined', () => {
    expect(formatDate(undefined)).toBe('');
  });

  /**
   * Test: Handles invalid date strings
   */
  it('returns empty string for invalid date string', () => {
    expect(formatDate('not-a-date')).toBe('');
    expect(formatDate('invalid')).toBe('');
  });

  /**
   * Test: Accepts custom formatting options
   */
  it('accepts custom formatting options', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    const result = formatDate(date, { month: 'long' });
    expect(result).toMatch(/15\s+January\s+2024/);
  });
});

describe('formatDateShort', () => {
  it('formats date as D MMM without year', () => {
    const result = formatDateShort('2024-01-15T10:30:00Z');
    expect(result).toMatch(/15\s+Jan/);
    // Should not include a year
    expect(result).not.toMatch(/\d{4}/);
  });

  it('returns empty string for null or undefined', () => {
    expect(formatDateShort(null)).toBe('');
    expect(formatDateShort(undefined)).toBe('');
  });
});

describe('formatDateTime', () => {
  /**
   * Test: Formats Date objects with time
   */
  it('formats a valid Date object with time', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    const result = formatDateTime(date);
    // Result includes date and time
    expect(result).toMatch(/15\s+January\s+2024/);
    // Time format depends on locale, just check it's not empty
    expect(result.length).toBeGreaterThan(12);
  });

  /**
   * Test: Formats ISO date strings with time
   */
  it('formats a valid ISO date string with time', () => {
    const result = formatDateTime('2024-03-20T15:45:00Z');
    expect(result).toMatch(/20\s+March\s+2024/);
    expect(result.length).toBeGreaterThan(12);
  });

  /**
   * Test: Handles null values
   */
  it('returns empty string for null', () => {
    expect(formatDateTime(null)).toBe('');
  });

  /**
   * Test: Handles undefined values
   */
  it('returns empty string for undefined', () => {
    expect(formatDateTime(undefined)).toBe('');
  });

  /**
   * Test: Handles invalid date strings
   */
  it('returns empty string for invalid date string', () => {
    expect(formatDateTime('not-a-date')).toBe('');
  });
});
