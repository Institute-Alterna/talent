/**
 * Webhook Verification Tests
 *
 * Unit tests for webhook signature verification and IP validation.
 */

import { createHmac } from 'crypto';
import {
  verifyTallySignature,
  verifyIP,
  getClientIP,
  verifyWebhook,
} from '@/lib/webhooks/verify';

describe('Webhook Verification', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    // Reset env vars
    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    });
    Object.assign(process.env, originalEnv);
  });

  afterAll(() => {
    Object.assign(process.env, originalEnv);
  });

  // Helper to set NODE_ENV without TypeScript errors
  const setNodeEnv = (env: string) => {
    Object.defineProperty(process.env, 'NODE_ENV', {
      value: env,
      writable: true,
      configurable: true,
    });
  };

  describe('verifyTallySignature', () => {
    const secret = 'test-webhook-secret';
    const payload = JSON.stringify({ test: 'data' });

    it('returns true for valid signature', () => {
      const signature = createHmac('sha256', secret).update(payload).digest('hex');

      const result = verifyTallySignature(payload, signature, secret);

      expect(result).toBe(true);
    });

    it('returns false for invalid signature', () => {
      const result = verifyTallySignature(payload, 'invalid-signature', secret);

      expect(result).toBe(false);
    });

    it('returns false for wrong secret', () => {
      const signature = createHmac('sha256', secret).update(payload).digest('hex');

      const result = verifyTallySignature(payload, signature, 'wrong-secret');

      expect(result).toBe(false);
    });

    it('returns false for modified payload', () => {
      const signature = createHmac('sha256', secret).update(payload).digest('hex');
      const modifiedPayload = JSON.stringify({ test: 'modified' });

      const result = verifyTallySignature(modifiedPayload, signature, secret);

      expect(result).toBe(false);
    });

    it('returns false for empty signature', () => {
      const result = verifyTallySignature(payload, '', secret);

      expect(result).toBe(false);
    });

    it('returns false for empty secret', () => {
      const signature = createHmac('sha256', secret).update(payload).digest('hex');

      const result = verifyTallySignature(payload, signature, '');

      expect(result).toBe(false);
    });

    it('handles malformed signatures gracefully', () => {
      const result = verifyTallySignature(payload, 'not-valid-hex!@#$', secret);

      expect(result).toBe(false);
    });
  });

  describe('verifyIP', () => {
    it('returns true in development mode', () => {
      setNodeEnv('development');

      const result = verifyIP('192.168.1.1');

      expect(result).toBe(true);
    });

    it('returns false for null IP in production', () => {
      setNodeEnv('production');

      const result = verifyIP(null);

      expect(result).toBe(false);
    });

    it('validates against configured whitelist', () => {
      setNodeEnv('production');
      process.env.TALLY_WEBHOOK_IP_WHITELIST = '192.168.1.1,10.0.0.1';

      expect(verifyIP('192.168.1.1')).toBe(true);
      expect(verifyIP('10.0.0.1')).toBe(true);
      expect(verifyIP('192.168.1.2')).toBe(false);
    });

    it('supports CIDR notation', () => {
      setNodeEnv('production');
      process.env.TALLY_WEBHOOK_IP_WHITELIST = '192.168.1.0/24';

      expect(verifyIP('192.168.1.1')).toBe(true);
      expect(verifyIP('192.168.1.254')).toBe(true);
      expect(verifyIP('192.168.2.1')).toBe(false);
    });

    it('allows all IPs with 0.0.0.0/0', () => {
      setNodeEnv('production');
      process.env.TALLY_WEBHOOK_IP_WHITELIST = '0.0.0.0/0';

      expect(verifyIP('1.2.3.4')).toBe(true);
      expect(verifyIP('255.255.255.255')).toBe(true);
    });
  });

  describe('getClientIP', () => {
    it('extracts IP from x-forwarded-for header', () => {
      const headers = new Headers({
        'x-forwarded-for': '192.168.1.1, 10.0.0.1',
      });

      const result = getClientIP(headers);

      expect(result).toBe('192.168.1.1');
    });

    it('extracts IP from x-real-ip header', () => {
      const headers = new Headers({
        'x-real-ip': '192.168.1.1',
      });

      const result = getClientIP(headers);

      expect(result).toBe('192.168.1.1');
    });

    it('extracts IP from cf-connecting-ip header', () => {
      const headers = new Headers({
        'cf-connecting-ip': '192.168.1.1',
      });

      const result = getClientIP(headers);

      expect(result).toBe('192.168.1.1');
    });

    it('prioritizes x-forwarded-for over other headers', () => {
      const headers = new Headers({
        'x-forwarded-for': '192.168.1.1',
        'x-real-ip': '10.0.0.1',
        'cf-connecting-ip': '172.16.0.1',
      });

      const result = getClientIP(headers);

      expect(result).toBe('192.168.1.1');
    });

    it('returns null when no IP headers present', () => {
      const headers = new Headers({
        'content-type': 'application/json',
      });

      const result = getClientIP(headers);

      expect(result).toBeNull();
    });
  });

  describe('verifyWebhook', () => {
    const secret = 'test-webhook-secret';
    const payload = JSON.stringify({ test: 'data' });

    beforeEach(() => {
      process.env.WEBHOOK_SECRET = secret;
      setNodeEnv('development');
    });

    it('returns valid for correct signature in development', () => {
      const signature = createHmac('sha256', secret).update(payload).digest('hex');
      const headers = new Headers({
        'tally-signature': signature,
        'x-forwarded-for': '192.168.1.1',
      });

      const result = verifyWebhook(payload, headers);

      expect(result.valid).toBe(true);
      expect(result.ip).toBe('192.168.1.1');
    });

    it('returns invalid for missing signature header', () => {
      const headers = new Headers({
        'x-forwarded-for': '192.168.1.1',
      });

      const result = verifyWebhook(payload, headers);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Missing tally-signature header');
    });

    it('returns invalid for wrong signature', () => {
      const headers = new Headers({
        'tally-signature': 'wrong-signature',
        'x-forwarded-for': '192.168.1.1',
      });

      const result = verifyWebhook(payload, headers);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid signature');
    });

    it('allows requests in development without secret configured', () => {
      delete process.env.WEBHOOK_SECRET;
      setNodeEnv('development');

      const headers = new Headers({
        'x-forwarded-for': '192.168.1.1',
      });

      const result = verifyWebhook(payload, headers);

      expect(result.valid).toBe(true);
    });

    it('rejects requests in production without secret configured', () => {
      delete process.env.WEBHOOK_SECRET;
      setNodeEnv('production');
      // Allow all IPs so we can test the secret check
      process.env.TALLY_WEBHOOK_IP_WHITELIST = '0.0.0.0/0';

      const headers = new Headers({
        'x-forwarded-for': '192.168.1.1',
      });

      const result = verifyWebhook(payload, headers);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('WEBHOOK_SECRET not configured');
    });
  });
});
