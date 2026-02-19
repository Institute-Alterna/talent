/**
 * Rate Limiter Tests
 *
 * Unit tests for webhook rate limiting functionality.
 */

import {
  checkRateLimit,
  createRateLimiter,
  webhookRateLimiter,
  strictRateLimiter,
  getRateLimitHeaders,
  resetRateLimit,
  clearAllRateLimits,
} from '@/lib/webhooks/rate-limiter';

describe('Rate Limiter', () => {
  beforeEach(() => {
    clearAllRateLimits();
  });

  describe('checkRateLimit', () => {
    it('allows requests within limit', () => {
      const config = { maxRequests: 5, windowMs: 1000 };

      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit('test-ip', config);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4 - i);
      }
    });

    it('blocks requests over limit', () => {
      const config = { maxRequests: 3, windowMs: 1000 };

      // Make 3 requests (should all be allowed)
      for (let i = 0; i < 3; i++) {
        checkRateLimit('test-ip', config);
      }

      // 4th request should be blocked
      const result = checkRateLimit('test-ip', config);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('tracks different identifiers separately', () => {
      const config = { maxRequests: 2, windowMs: 1000 };

      // Use up limit for ip-1
      checkRateLimit('ip-1', config);
      checkRateLimit('ip-1', config);

      // ip-2 should still have its own limit
      const result = checkRateLimit('ip-2', config);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);

      // ip-1 should be blocked
      const blocked = checkRateLimit('ip-1', config);
      expect(blocked.allowed).toBe(false);
    });

    it('includes count in result', () => {
      const config = { maxRequests: 5, windowMs: 1000 };

      const result1 = checkRateLimit('test-ip', config);
      expect(result1.count).toBe(1);

      const result2 = checkRateLimit('test-ip', config);
      expect(result2.count).toBe(2);
    });

    it('includes resetAt timestamp', () => {
      const config = { maxRequests: 5, windowMs: 60000 };
      const now = Math.floor(Date.now() / 1000);

      const result = checkRateLimit('test-ip', config);

      // Reset time should be roughly 1 minute from now
      expect(result.resetAt).toBeGreaterThanOrEqual(now);
      expect(result.resetAt).toBeLessThanOrEqual(now + 70);
    });
  });

  describe('createRateLimiter', () => {
    it('creates limiter with custom config', () => {
      const customLimiter = createRateLimiter({ maxRequests: 2, windowMs: 5000 });

      const result1 = customLimiter('custom-ip');
      expect(result1.allowed).toBe(true);

      const result2 = customLimiter('custom-ip');
      expect(result2.allowed).toBe(true);

      const result3 = customLimiter('custom-ip');
      expect(result3.allowed).toBe(false);
    });
  });

  describe('webhookRateLimiter', () => {
    it('allows 100 requests per minute', () => {
      // Make 100 requests
      for (let i = 0; i < 100; i++) {
        const result = webhookRateLimiter(`webhook-ip-${Math.floor(i / 10)}`);
        expect(result.allowed).toBe(true);
      }
    });

    it('blocks after 100 requests from same IP', () => {
      // Use up the limit
      for (let i = 0; i < 100; i++) {
        webhookRateLimiter('same-ip');
      }

      // Should be blocked now
      const result = webhookRateLimiter('same-ip');
      expect(result.allowed).toBe(false);
    });
  });

  describe('strictRateLimiter', () => {
    it('allows only 10 requests per minute', () => {
      // Make 10 requests
      for (let i = 0; i < 10; i++) {
        const result = strictRateLimiter('strict-ip');
        expect(result.allowed).toBe(true);
      }

      // 11th should be blocked
      const result = strictRateLimiter('strict-ip');
      expect(result.allowed).toBe(false);
    });
  });

  describe('getRateLimitHeaders', () => {
    it('returns correct headers', () => {
      const result = {
        allowed: true,
        remaining: 95,
        resetAt: 1704067260,
        count: 5,
      };

      const headers = getRateLimitHeaders(result);

      expect(headers).toEqual({
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '95',
        'X-RateLimit-Reset': '1704067260',
      });
    });

    it('shows 0 remaining when blocked', () => {
      const result = {
        allowed: false,
        remaining: 0,
        resetAt: 1704067260,
        count: 100,
      };

      const headers = getRateLimitHeaders(result);

      expect(headers['X-RateLimit-Remaining']).toBe('0');
    });
  });

  describe('resetRateLimit', () => {
    it('clears rate limit for specific identifier', () => {
      const config = { maxRequests: 2, windowMs: 60000 };

      // Use up limit
      checkRateLimit('reset-test', config);
      checkRateLimit('reset-test', config);
      expect(checkRateLimit('reset-test', config).allowed).toBe(false);

      // Reset
      resetRateLimit('reset-test');

      // Should be allowed again
      expect(checkRateLimit('reset-test', config).allowed).toBe(true);
    });
  });

  describe('clearAllRateLimits', () => {
    it('clears all rate limits', () => {
      const config = { maxRequests: 1, windowMs: 60000 };

      // Use up limits for multiple IPs
      checkRateLimit('ip-a', config);
      checkRateLimit('ip-b', config);

      expect(checkRateLimit('ip-a', config).allowed).toBe(false);
      expect(checkRateLimit('ip-b', config).allowed).toBe(false);

      // Clear all
      clearAllRateLimits();

      // Both should be allowed
      expect(checkRateLimit('ip-a', config).allowed).toBe(true);
      expect(checkRateLimit('ip-b', config).allowed).toBe(true);
    });
  });
});
