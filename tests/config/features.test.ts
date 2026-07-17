/**
 * Feature flag helpers
 */

import { parseEnvFlag, isPriorityProcessingEnabled } from '@/config/features';

describe('parseEnvFlag', () => {
  it('returns false for unset, empty, and whitespace', () => {
    expect(parseEnvFlag(undefined)).toBe(false);
    expect(parseEnvFlag(null)).toBe(false);
    expect(parseEnvFlag('')).toBe(false);
    expect(parseEnvFlag('   ')).toBe(false);
  });

  it('returns true for common truthy values (case-insensitive)', () => {
    expect(parseEnvFlag('true')).toBe(true);
    expect(parseEnvFlag('TRUE')).toBe(true);
    expect(parseEnvFlag('1')).toBe(true);
    expect(parseEnvFlag('yes')).toBe(true);
    expect(parseEnvFlag('ON')).toBe(true);
    expect(parseEnvFlag('  true  ')).toBe(true);
  });

  it('returns false for other values', () => {
    expect(parseEnvFlag('false')).toBe(false);
    expect(parseEnvFlag('0')).toBe(false);
    expect(parseEnvFlag('no')).toBe(false);
    expect(parseEnvFlag('off')).toBe(false);
    expect(parseEnvFlag('enabled')).toBe(false);
  });
});

describe('isPriorityProcessingEnabled', () => {
  const original = process.env.NEXT_PUBLIC_PRIORITY_PROCESSING_ENABLED;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_PRIORITY_PROCESSING_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_PRIORITY_PROCESSING_ENABLED = original;
    }
  });

  it('reads NEXT_PUBLIC_PRIORITY_PROCESSING_ENABLED', () => {
    process.env.NEXT_PUBLIC_PRIORITY_PROCESSING_ENABLED = '1';
    expect(isPriorityProcessingEnabled()).toBe(true);

    process.env.NEXT_PUBLIC_PRIORITY_PROCESSING_ENABLED = 'false';
    expect(isPriorityProcessingEnabled()).toBe(false);
  });
});
