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

import { cn } from '@/lib/utils';

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
