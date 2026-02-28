/**
 * Agreement Webhook Unit Tests
 *
 * Tests for POST /api/webhooks/tally/agreement
 *
 * @jest-environment node
 */

import { POST, OPTIONS } from '@/app/api/webhooks/tally/agreement/route';
import { NextRequest } from 'next/server';
import {
  createAgreementPayload,
  generateWebhookSignature,
} from '@/tests/fixtures/tally-webhooks';
import { clearAllRateLimits } from '@/lib/webhooks';

// Mock the database and services
jest.mock('@/lib/db', () => ({
  db: {
    application: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/services/applications', () => ({
  getApplicationById: jest.fn(),
  getApplicationByAgreementTallySubmissionId: jest.fn(),
  updateApplicationAgreementAndAdvance: jest.fn(),
}));

jest.mock('@/lib/audit', () => ({
  logWebhookReceived: jest.fn(),
  logStageChange: jest.fn(),
}));

import {
  getApplicationById,
  getApplicationByAgreementTallySubmissionId,
  updateApplicationAgreementAndAdvance,
} from '@/lib/services/applications';
import { logStageChange, logWebhookReceived } from '@/lib/audit';

// Helper to set NODE_ENV without TypeScript errors
const setNodeEnv = (env: string) => {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: env,
    writable: true,
    configurable: true,
  });
};

describe('POST /api/webhooks/tally/agreement', () => {
  const webhookSecret = 'test-secret';
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    clearAllRateLimits();
    process.env.WEBHOOK_SECRET = webhookSecret;
    setNodeEnv('development');
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  function createRequest(payload: unknown, secret?: string): NextRequest {
    const body = JSON.stringify(payload);
    const headers = new Headers({
      'content-type': 'application/json',
      'x-forwarded-for': '192.168.1.1',
    });
    if (secret) {
      headers.set('x-webhook-secret', secret);
    }
    return new NextRequest('http://localhost/api/webhooks/tally/agreement', {
      method: 'POST',
      headers,
      body,
    });
  }

  describe('Successful agreement processing', () => {
    it('stores agreement data and advances to SIGNED', async () => {
      const payload = createAgreementPayload({ applicationId: 'app-123' });
      const signature = generateWebhookSignature(payload, webhookSecret);

      const mockApplication = {
        id: 'app-123',
        personId: 'person-123',
        position: 'Software Developer',
        currentStage: 'AGREEMENT',
        status: 'ACCEPTED',
      };

      (getApplicationByAgreementTallySubmissionId as jest.Mock).mockResolvedValue(null);
      (getApplicationById as jest.Mock).mockResolvedValue(mockApplication);
      (updateApplicationAgreementAndAdvance as jest.Mock).mockResolvedValue(mockApplication);

      const request = createRequest(payload, signature);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.applicationId).toBe('app-123');
      expect(data.data.currentStage).toBe('SIGNED');

      // Should store agreement data and advance atomically
      expect(updateApplicationAgreementAndAdvance).toHaveBeenCalledWith('app-123', expect.objectContaining({
        agreementTallySubmissionId: expect.any(String),
        agreementSignedAt: expect.any(Date),
        agreementData: expect.objectContaining({
          applicationId: 'app-123',
          legalFirstName: 'John',
          legalLastName: 'Doe',
        }),
      }));

      // Should log webhook receipt with person context
      expect(logWebhookReceived).toHaveBeenCalledWith(
        'agreement',
        'person-123',
        'app-123',
        expect.objectContaining({
          personName: 'John Doe',
          position: 'Software Developer',
          eventId: expect.any(String),
        }),
        expect.any(String)
      );

      // Should log stage change with person name
      expect(logStageChange).toHaveBeenCalledWith(
        'app-123',
        'person-123',
        'AGREEMENT',
        'SIGNED',
        undefined,
        expect.stringContaining('John Doe')
      );
    });
  });

  describe('Idempotency', () => {
    it('returns success for duplicate submission without reprocessing', async () => {
      const payload = createAgreementPayload({ applicationId: 'app-123' });
      const signature = generateWebhookSignature(payload, webhookSecret);

      (getApplicationByAgreementTallySubmissionId as jest.Mock).mockResolvedValue({
        id: 'app-123',
        personId: 'person-123',
      });

      const request = createRequest(payload, signature);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('Duplicate');
      expect(data.applicationId).toBe('app-123');
      expect(updateApplicationAgreementAndAdvance).not.toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('returns 404 when application not found', async () => {
      const payload = createAgreementPayload({ applicationId: 'non-existent' });
      const signature = generateWebhookSignature(payload, webhookSecret);

      (getApplicationByAgreementTallySubmissionId as jest.Mock).mockResolvedValue(null);
      (getApplicationById as jest.Mock).mockResolvedValue(null);

      const request = createRequest(payload, signature);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('Application not found');
    });

    it('returns 200 when application offer was withdrawn (REJECTED)', async () => {
      const payload = createAgreementPayload({ applicationId: 'app-withdrawn' });
      const signature = generateWebhookSignature(payload, webhookSecret);

      (getApplicationByAgreementTallySubmissionId as jest.Mock).mockResolvedValue(null);
      (getApplicationById as jest.Mock).mockResolvedValue({
        id: 'app-withdrawn',
        personId: 'person-123',
        currentStage: 'AGREEMENT',
        status: 'REJECTED',
      });

      const request = createRequest(payload, signature);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('withdrawn');
      expect(updateApplicationAgreementAndAdvance).not.toHaveBeenCalled();
    });

    it('returns 400 when application is not ACCEPTED', async () => {
      const payload = createAgreementPayload({ applicationId: 'app-active' });
      const signature = generateWebhookSignature(payload, webhookSecret);

      (getApplicationByAgreementTallySubmissionId as jest.Mock).mockResolvedValue(null);
      (getApplicationById as jest.Mock).mockResolvedValue({
        id: 'app-active',
        personId: 'person-123',
        currentStage: 'AGREEMENT',
        status: 'ACTIVE',
      });

      const request = createRequest(payload, signature);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('not in ACCEPTED status');
    });

    it('returns 400 when application is not at AGREEMENT stage', async () => {
      const payload = createAgreementPayload({ applicationId: 'app-wrong-stage' });
      const signature = generateWebhookSignature(payload, webhookSecret);

      (getApplicationByAgreementTallySubmissionId as jest.Mock).mockResolvedValue(null);
      (getApplicationById as jest.Mock).mockResolvedValue({
        id: 'app-wrong-stage',
        personId: 'person-123',
        currentStage: 'INTERVIEW',
        status: 'ACCEPTED',
      });

      const request = createRequest(payload, signature);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('not at AGREEMENT stage');
    });

    it('returns 400 for missing required fields', async () => {
      // Payload without applicationId field
      const payload = createAgreementPayload();
      payload.data.fields = payload.data.fields.filter(
        (f) => f.label !== 'applicationId'
      );
      const signature = generateWebhookSignature(payload, webhookSecret);

      (getApplicationByAgreementTallySubmissionId as jest.Mock).mockResolvedValue(null);

      const request = createRequest(payload, signature);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Application ID');
    });
  });

  describe('Authentication', () => {
    it('returns 401 for invalid secret in production', async () => {
      setNodeEnv('production');
      process.env.TALLY_WEBHOOK_IP_WHITELIST = '0.0.0.0/0';

      const payload = createAgreementPayload();
      const request = createRequest(payload, 'wrong-secret');

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid webhook secret');
    });
  });

  describe('Rate limiting', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const payload = createAgreementPayload();
      const signature = generateWebhookSignature(payload, webhookSecret);

      // Exhaust rate limit (100 requests)
      for (let i = 0; i < 100; i++) {
        const req = createRequest(
          createAgreementPayload({ submissionId: `sub-${i}` }),
          generateWebhookSignature(createAgreementPayload({ submissionId: `sub-${i}` }), webhookSecret)
        );
      (getApplicationByAgreementTallySubmissionId as jest.Mock).mockResolvedValue({ id: `app-${i}` });
        await POST(req);
      }

      const request = createRequest(payload, signature);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Rate limit');
    });
  });
});

describe('OPTIONS /api/webhooks/tally/agreement', () => {
  it('returns CORS headers', async () => {
    const response = await OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('x-webhook-secret');
  });
});
