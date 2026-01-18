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

import { cn, isValidUUID } from '@/lib/utils';

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
