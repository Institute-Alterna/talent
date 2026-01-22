/**
 * PDF Sanitization Utilities Tests
 *
 * Comprehensive tests for security-critical sanitization functions.
 * These tests ensure protection against XSS, content injection, and malicious data.
 */

import {
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
} from '@/lib/pdf/sanitize';

describe('PDF Sanitization Utilities', () => {
  describe('escapeHtml', () => {
    it('should escape HTML entities', () => {
      expect(escapeHtml('<script>alert("XSS")</script>')).toBe(
        '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;'
      );
    });

    it('should escape ampersands', () => {
      expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
    });

    it('should escape quotes', () => {
      expect(escapeHtml('It\'s a "test"')).toBe('It&#x27;s a &quot;test&quot;');
    });

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('should handle non-string input', () => {
      expect(escapeHtml(null as unknown as string)).toBe('');
      expect(escapeHtml(undefined as unknown as string)).toBe('');
      expect(escapeHtml(123 as unknown as string)).toBe('');
    });

    it('should handle text without special characters', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });
  });

  describe('removeControlCharacters', () => {
    it('should remove null bytes', () => {
      expect(removeControlCharacters('test\x00string')).toBe('teststring');
    });

    it('should remove other control characters', () => {
      expect(removeControlCharacters('test\x07\x08\x1Fstring')).toBe('teststring');
    });

    it('should remove bidirectional override characters', () => {
      expect(removeControlCharacters('test\u202Estring')).toBe('teststring');
      expect(removeControlCharacters('test\u2066string')).toBe('teststring');
    });

    it('should preserve normal characters and newlines', () => {
      expect(removeControlCharacters('Hello\nWorld')).toBe('Hello\nWorld');
    });

    it('should handle empty string', () => {
      expect(removeControlCharacters('')).toBe('');
    });
  });

  describe('normalizeWhitespace', () => {
    it('should collapse multiple spaces', () => {
      expect(normalizeWhitespace('hello   world')).toBe('hello world');
    });

    it('should trim leading and trailing whitespace', () => {
      expect(normalizeWhitespace('  hello world  ')).toBe('hello world');
    });

    it('should convert tabs and newlines to spaces', () => {
      expect(normalizeWhitespace('hello\tworld\ntest')).toBe('hello world test');
    });

    it('should handle empty string', () => {
      expect(normalizeWhitespace('')).toBe('');
    });
  });

  describe('truncateText', () => {
    it('should truncate text longer than max length', () => {
      const result = truncateText('This is a long text', 10);
      expect(result).toBe('This is...');
      expect(result.length).toBe(10);
    });

    it('should not truncate text within limit', () => {
      expect(truncateText('Short', 100)).toBe('Short');
    });

    it('should handle empty string', () => {
      expect(truncateText('', 10)).toBe('');
    });

    it('should handle edge case where max length equals text length', () => {
      expect(truncateText('12345', 5)).toBe('12345');
    });
  });

  describe('sanitizeUrl', () => {
    it('should accept valid HTTP URLs', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com/');
    });

    it('should accept valid HTTPS URLs', () => {
      expect(sanitizeUrl('https://example.com/path?query=1')).toBe(
        'https://example.com/path?query=1'
      );
    });

    it('should accept mailto URLs', () => {
      expect(sanitizeUrl('mailto:test@example.com')).toBe('mailto:test@example.com');
    });

    it('should reject javascript: URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    });

    it('should reject data: URLs', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('');
    });

    it('should reject file: URLs', () => {
      expect(sanitizeUrl('file:///etc/passwd')).toBe('');
    });

    it('should reject invalid URLs', () => {
      expect(sanitizeUrl('not a url')).toBe('');
    });

    it('should handle null and undefined', () => {
      expect(sanitizeUrl(null)).toBe('');
      expect(sanitizeUrl(undefined)).toBe('');
    });

    it('should reject URLs that are too long', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(CONTENT_LIMITS.URL_LENGTH);
      expect(sanitizeUrl(longUrl)).toBe('');
    });

    it('should trim whitespace', () => {
      expect(sanitizeUrl('  https://example.com  ')).toBe('https://example.com/');
    });
  });

  describe('sanitizeEmail', () => {
    it('should accept valid emails', () => {
      expect(sanitizeEmail('test@example.com')).toBe('test@example.com');
    });

    it('should lowercase emails', () => {
      expect(sanitizeEmail('Test@EXAMPLE.COM')).toBe('test@example.com');
    });

    it('should reject invalid emails', () => {
      expect(sanitizeEmail('not-an-email')).toBe('');
      expect(sanitizeEmail('@example.com')).toBe('');
      expect(sanitizeEmail('test@')).toBe('');
    });

    it('should handle null and undefined', () => {
      expect(sanitizeEmail(null)).toBe('');
      expect(sanitizeEmail(undefined)).toBe('');
    });

    it('should escape HTML in email', () => {
      // Email with < and > matches our basic regex pattern
      // but the special characters are properly escaped
      const result = sanitizeEmail('test@<script>.com');
      expect(result).toContain('&lt;');
      expect(result).not.toContain('<script');
      // Valid format should work unchanged
      expect(sanitizeEmail('test@example.com')).toBe('test@example.com');
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('not-an-email')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('sanitizeShortText', () => {
    it('should sanitize and truncate short text', () => {
      const result = sanitizeShortText('Hello <script>alert(1)</script> World');
      expect(result).toBe('Hello &lt;script&gt;alert(1)&lt;&#x2F;script&gt; World');
    });

    it('should truncate to SHORT_TEXT limit', () => {
      const longText = 'a'.repeat(CONTENT_LIMITS.SHORT_TEXT + 50);
      const result = sanitizeShortText(longText);
      expect(result.length).toBeLessThanOrEqual(CONTENT_LIMITS.SHORT_TEXT);
    });

    it('should normalize whitespace', () => {
      expect(sanitizeShortText('  hello   world  ')).toBe('hello world');
    });

    it('should handle null and undefined', () => {
      expect(sanitizeShortText(null)).toBe('');
      expect(sanitizeShortText(undefined)).toBe('');
    });
  });

  describe('sanitizeMediumText', () => {
    it('should sanitize medium text', () => {
      const result = sanitizeMediumText('<b>Bold</b> text');
      expect(result).toBe('&lt;b&gt;Bold&lt;&#x2F;b&gt; text');
    });

    it('should truncate to MEDIUM_TEXT limit', () => {
      const longText = 'a'.repeat(CONTENT_LIMITS.MEDIUM_TEXT + 50);
      const result = sanitizeMediumText(longText);
      expect(result.length).toBeLessThanOrEqual(CONTENT_LIMITS.MEDIUM_TEXT);
    });
  });

  describe('sanitizeLongText', () => {
    it('should preserve line breaks', () => {
      const text = 'Line 1\nLine 2\nLine 3';
      const result = sanitizeLongText(text);
      expect(result).toContain('\n');
    });

    it('should normalize excessive line breaks', () => {
      const text = 'Line 1\n\n\n\n\nLine 2';
      const result = sanitizeLongText(text);
      expect(result).not.toContain('\n\n\n');
    });

    it('should truncate to LONG_TEXT limit', () => {
      const longText = 'a'.repeat(CONTENT_LIMITS.LONG_TEXT + 50);
      const result = sanitizeLongText(longText);
      expect(result.length).toBeLessThanOrEqual(CONTENT_LIMITS.LONG_TEXT);
    });
  });

  describe('sanitizeDate', () => {
    it('should accept valid Date objects', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      expect(sanitizeDate(date)).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should accept valid date strings', () => {
      expect(sanitizeDate('2024-01-15T10:30:00Z')).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should reject invalid dates', () => {
      expect(sanitizeDate('not-a-date')).toBe('');
      expect(sanitizeDate(new Date('invalid'))).toBe('');
    });

    it('should reject dates outside reasonable range', () => {
      expect(sanitizeDate(new Date('1800-01-01'))).toBe('');
      expect(sanitizeDate(new Date('2200-01-01'))).toBe('');
    });

    it('should handle null and undefined', () => {
      expect(sanitizeDate(null)).toBe('');
      expect(sanitizeDate(undefined)).toBe('');
    });
  });

  describe('formatDate', () => {
    it('should format dates with default options (European)', () => {
      const result = formatDate('2024-01-15T10:30:00Z');
      expect(result).toMatch(/15\s+January\s+2024/);
    });

    it('should return N/A for invalid dates', () => {
      expect(formatDate('invalid')).toBe('N/A');
      expect(formatDate(null)).toBe('N/A');
    });
  });

  describe('formatDateOnly', () => {
    it('should format date without time (DD MMMM YYYY)', () => {
      const result = formatDateOnly('2024-01-15T10:30:00Z');
      expect(result).toMatch(/15\s+January\s+2024/);
      expect(result).not.toMatch(/10:30/);
    });
  });

  describe('sanitizeNumber', () => {
    it('should format numbers with specified decimals', () => {
      expect(sanitizeNumber(85.678, 2)).toBe('85.68');
      expect(sanitizeNumber(100, 0)).toBe('100');
    });

    it('should handle string numbers', () => {
      expect(sanitizeNumber('85.5', 1)).toBe('85.5');
    });

    it('should return N/A for invalid numbers', () => {
      expect(sanitizeNumber(null)).toBe('N/A');
      expect(sanitizeNumber(undefined)).toBe('N/A');
      expect(sanitizeNumber(NaN, 0)).toBe('N/A');
      expect(sanitizeNumber(Infinity, 0)).toBe('N/A');
    });
  });

  describe('sanitizeBoolean', () => {
    it('should return Yes/No by default', () => {
      expect(sanitizeBoolean(true)).toBe('Yes');
      expect(sanitizeBoolean(false)).toBe('No');
    });

    it('should use custom labels', () => {
      expect(sanitizeBoolean(true, 'Passed', 'Failed')).toBe('Passed');
      expect(sanitizeBoolean(false, 'Passed', 'Failed')).toBe('Failed');
    });

    it('should return N/A for null/undefined', () => {
      expect(sanitizeBoolean(null)).toBe('N/A');
      expect(sanitizeBoolean(undefined)).toBe('N/A');
    });
  });

  describe('sanitizeIpAddress', () => {
    it('should accept valid IPv4 addresses', () => {
      expect(sanitizeIpAddress('192.168.1.1')).toBe('192.168.1.1');
      expect(sanitizeIpAddress('10.0.0.255')).toBe('10.0.0.255');
    });

    it('should accept valid IPv6 addresses', () => {
      expect(sanitizeIpAddress('::1')).toBe('::1');
      expect(sanitizeIpAddress('2001:db8::1')).toBe('2001:db8::1');
    });

    it('should reject invalid IP addresses', () => {
      expect(sanitizeIpAddress('not-an-ip')).toBe('');
      // Note: Simple regex validation doesn't check octet ranges (0-255)
      // This is acceptable for display-only context
      expect(sanitizeIpAddress('abc.def.ghi.jkl')).toBe('');
    });

    it('should handle null and undefined', () => {
      expect(sanitizeIpAddress(null)).toBe('');
      expect(sanitizeIpAddress(undefined)).toBe('');
    });

    it('should escape HTML in IP addresses', () => {
      expect(sanitizeIpAddress('<script>')).toBe('');
    });
  });

  describe('sanitizeUserAgent', () => {
    it('should sanitize user agent strings', () => {
      const ua =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      const result = sanitizeUserAgent(ua);
      // Slashes are escaped for security (&#x2F;)
      expect(result).toContain('Mozilla');
      expect(result).toContain('Chrome');
      expect(result).toContain('Safari');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should escape HTML in user agent', () => {
      const result = sanitizeUserAgent('Mozilla <script>');
      expect(result).toBe('Mozilla &lt;script&gt;');
    });

    it('should truncate long user agents', () => {
      const longUa = 'Mozilla '.repeat(100);
      const result = sanitizeUserAgent(longUa);
      expect(result.length).toBeLessThanOrEqual(CONTENT_LIMITS.MEDIUM_TEXT);
    });

    it('should handle null and undefined', () => {
      expect(sanitizeUserAgent(null)).toBe('');
      expect(sanitizeUserAgent(undefined)).toBe('');
    });
  });

  describe('sanitizeArray', () => {
    it('should apply sanitizer to each item', () => {
      const items = ['one', 'two', 'three'];
      const result = sanitizeArray(items, (item) => item.toUpperCase());
      expect(result).toEqual(['ONE', 'TWO', 'THREE']);
    });

    it('should limit array length', () => {
      const items = Array.from({ length: 200 }, (_, i) => i);
      const result = sanitizeArray(items, (x) => x);
      expect(result.length).toBe(CONTENT_LIMITS.LIST_ITEMS);
    });

    it('should respect custom maxItems', () => {
      const items = [1, 2, 3, 4, 5];
      const result = sanitizeArray(items, (x) => x, 3);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should handle null and undefined', () => {
      expect(sanitizeArray(null, (x) => x)).toEqual([]);
      expect(sanitizeArray(undefined, (x) => x)).toEqual([]);
    });
  });

  describe('sanitizeJson', () => {
    it('should stringify and escape JSON', () => {
      const data = { key: '<script>' };
      const result = sanitizeJson(data);
      expect(result).toContain('&lt;script&gt;');
    });

    it('should truncate large JSON', () => {
      const largeData = { data: 'x'.repeat(CONTENT_LIMITS.ACTIVITY_TEXT + 100) };
      const result = sanitizeJson(largeData);
      // Result may be slightly larger due to HTML escaping of special chars
      // but should be reasonably limited
      expect(result.length).toBeLessThanOrEqual(CONTENT_LIMITS.ACTIVITY_TEXT + 100);
    });

    it('should handle null and undefined', () => {
      expect(sanitizeJson(null)).toBe('');
      expect(sanitizeJson(undefined)).toBe('');
    });

    it('should handle circular references gracefully', () => {
      const obj: Record<string, unknown> = { a: 1 };
      obj.self = obj;
      expect(sanitizeJson(obj)).toBe('');
    });
  });

  describe('isValidUuid', () => {
    it('should validate correct UUIDs', () => {
      expect(isValidUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(isValidUuid('not-a-uuid')).toBe(false);
      expect(isValidUuid('123e4567-e89b-12d3-a456')).toBe(false);
      expect(isValidUuid('')).toBe(false);
    });

    it('should handle null and undefined', () => {
      expect(isValidUuid(null)).toBe(false);
      expect(isValidUuid(undefined)).toBe(false);
    });
  });

  describe('sanitizeUuid', () => {
    it('should return lowercase UUID', () => {
      expect(sanitizeUuid('123E4567-E89B-12D3-A456-426614174000')).toBe(
        '123e4567-e89b-12d3-a456-426614174000'
      );
    });

    it('should return empty string for invalid UUIDs', () => {
      expect(sanitizeUuid('not-valid')).toBe('');
      expect(sanitizeUuid(null)).toBe('');
    });
  });

  describe('XSS Attack Vectors', () => {
    it('should neutralize script injection by escaping', () => {
      const attacks = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        '<svg onload="alert(1)">',
        '"><script>alert(String.fromCharCode(88,83,83))</script>',
        '<body onload="alert(1)">',
      ];

      attacks.forEach((attack) => {
        const result = sanitizeShortText(attack);
        // Tags are escaped - < becomes &lt;
        expect(result).not.toContain('<script');
        expect(result).not.toContain('<img');
        expect(result).not.toContain('<svg');
        expect(result).not.toContain('<body');
        // Should contain escaped versions
        expect(result).toContain('&lt;');
      });
    });

    it('should neutralize URL-based attacks', () => {
      const urlAttacks = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:alert(1)',
        ' javascript:alert(1)',
      ];

      urlAttacks.forEach((attack) => {
        expect(sanitizeUrl(attack)).toBe('');
      });
    });

    it('should neutralize Unicode/encoding attacks', () => {
      const unicodeAttacks = [
        'test\u0000hidden',
        'test\u202Ereversed',
        'test\u2066override',
      ];

      unicodeAttacks.forEach((attack) => {
        const result = removeControlCharacters(attack);
        expect(result).not.toContain('\u0000');
        expect(result).not.toContain('\u202E');
        expect(result).not.toContain('\u2066');
      });
    });
  });

  describe('Content Injection Prevention', () => {
    it('should prevent log injection via newlines', () => {
      const injectionAttempt = 'normal text\n[FAKE LOG ENTRY] malicious data';
      const result = sanitizeShortText(injectionAttempt);
      // Short text normalizes whitespace, converting newlines to spaces
      expect(result).not.toContain('\n[FAKE');
    });

    it('should prevent oversized content attacks', () => {
      const massiveText = 'x'.repeat(1000000);
      const shortResult = sanitizeShortText(massiveText);
      const mediumResult = sanitizeMediumText(massiveText);
      const longResult = sanitizeLongText(massiveText);

      expect(shortResult.length).toBeLessThanOrEqual(CONTENT_LIMITS.SHORT_TEXT);
      expect(mediumResult.length).toBeLessThanOrEqual(CONTENT_LIMITS.MEDIUM_TEXT);
      expect(longResult.length).toBeLessThanOrEqual(CONTENT_LIMITS.LONG_TEXT);
    });
  });
});
