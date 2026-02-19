/**
 * Application Webhook Integration Tests
 *
 * Tests for POST /api/webhooks/tally/application
 *
 * @jest-environment node
 */

import { POST, OPTIONS } from '@/app/api/webhooks/tally/application/route';
import { NextRequest } from 'next/server';
import {
  createApplicationPayload,
  
  createInvalidPayload,
  generateWebhookSignature,
} from '@/tests/fixtures/tally-webhooks';
import { clearAllRateLimits, APPLICATION_FIELD_KEYS } from '@/lib/webhooks';

// Mock the database and services
jest.mock('@/lib/db', () => ({
  db: {
    person: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    application: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/services/persons', () => ({
  findOrCreatePerson: jest.fn(),
  hasPassedGeneralCompetencies: jest.fn(),
}));

jest.mock('@/lib/services/applications', () => ({
  createApplication: jest.fn(),
  getApplicationByTallySubmissionId: jest.fn(),
  advanceApplicationStage: jest.fn(),
  updateApplicationStatus: jest.fn(),
}));

jest.mock('@/lib/audit', () => ({
  logWebhookReceived: jest.fn(),
  logPersonCreated: jest.fn(),
  logApplicationCreated: jest.fn(),
  logStageChange: jest.fn(),
  logStatusChange: jest.fn(),
}));

import { findOrCreatePerson, hasPassedGeneralCompetencies } from '@/lib/services/persons';
import {
  createApplication,
  getApplicationByTallySubmissionId,
  advanceApplicationStage,
  updateApplicationStatus,
} from '@/lib/services/applications';

// Helper to set NODE_ENV without TypeScript errors
const setNodeEnv = (env: string) => {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: env,
    writable: true,
    configurable: true,
  });
};

describe('POST /api/webhooks/tally/application', () => {
  const webhookSecret = 'test-secret';
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    clearAllRateLimits();
    process.env.WEBHOOK_SECRET = webhookSecret;
    setNodeEnv('development');
    // Suppress console output during tests
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
    return new NextRequest('http://localhost/api/webhooks/tally/application', {
      method: 'POST',
      headers,
      body,
    });
  }

  describe('Successful submission', () => {
    it('creates person and application for new applicant', async () => {
      const payload = createApplicationPayload();
      const signature = generateWebhookSignature(payload, webhookSecret);

      const mockPerson = { id: 'person-123', email: 'test@example.com' };
      const mockApplication = {
        id: 'app-123',
        personId: 'person-123',
        position: 'Software Developer',
        currentStage: 'APPLICATION',
        status: 'ACTIVE',
        hasResume: true,
        hasAcademicBg: true,
        hasVideoIntro: true,
        hasPreviousExp: true,
        hasOtherFile: false,
        resumeUrl: 'https://tally.so/files/resume.pdf',
        academicBackground: 'Computer Science degree',
        videoLink: 'https://youtube.com',
        previousExperience: 'Experience',
        otherFileUrl: null,
      };

      (getApplicationByTallySubmissionId as jest.Mock).mockResolvedValue(null);
      (findOrCreatePerson as jest.Mock).mockResolvedValue({
        person: mockPerson,
        created: true,
      });
      (createApplication as jest.Mock).mockResolvedValue(mockApplication);

      const request = createRequest(payload, signature);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.personId).toBe('person-123');
      expect(data.data.applicationId).toBe('app-123');
      expect(data.data.personCreated).toBe(true);
      expect(data.data.nextStep).toBe('send_gc_assessment');
    });

    it('links application to existing person', async () => {
      const payload = createApplicationPayload({ email: 'existing@example.com' });
      const signature = generateWebhookSignature(payload, webhookSecret);

      const mockPerson = {
        id: 'existing-person',
        email: 'existing@example.com',
        generalCompetenciesCompleted: false,
      };
      const mockApplication = {
        id: 'app-456',
        personId: 'existing-person',
        position: 'Software Developer',
        currentStage: 'APPLICATION',
        status: 'ACTIVE',
        hasResume: false,
        hasAcademicBg: false,
        hasVideoIntro: false,
        hasPreviousExp: false,
        hasOtherFile: false,
        resumeUrl: null,
        academicBackground: null,
        videoLink: null,
        previousExperience: null,
        otherFileUrl: null,
      };

      (getApplicationByTallySubmissionId as jest.Mock).mockResolvedValue(null);
      (findOrCreatePerson as jest.Mock).mockResolvedValue({
        person: mockPerson,
        created: false,
      });
      (createApplication as jest.Mock).mockResolvedValue(mockApplication);

      const request = createRequest(payload, signature);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.personCreated).toBe(false);
    });

    it('auto-advances application if person already passed GC', async () => {
      const payload = createApplicationPayload();
      const signature = generateWebhookSignature(payload, webhookSecret);

      const mockPerson = {
        id: 'gc-passed-person',
        email: 'test@example.com',
        generalCompetenciesCompleted: true,
      };
      const mockApplication = {
        id: 'app-789',
        personId: 'gc-passed-person',
        position: 'Software Developer',
        currentStage: 'APPLICATION',
        status: 'ACTIVE',
        hasResume: false,
        hasAcademicBg: false,
        hasVideoIntro: false,
        hasPreviousExp: false,
        hasOtherFile: false,
        resumeUrl: null,
        academicBackground: null,
        videoLink: null,
        previousExperience: null,
        otherFileUrl: null,
      };

      (getApplicationByTallySubmissionId as jest.Mock).mockResolvedValue(null);
      (findOrCreatePerson as jest.Mock).mockResolvedValue({
        person: mockPerson,
        created: false,
      });
      (createApplication as jest.Mock).mockResolvedValue(mockApplication);
      (hasPassedGeneralCompetencies as jest.Mock).mockResolvedValue(true);

      const request = createRequest(payload, signature);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.nextStep).toBe('advance_to_specialized');
      expect(advanceApplicationStage).toHaveBeenCalledWith('app-789', 'SPECIALIZED_COMPETENCIES');
    });

    it('rejects application if person previously failed GC', async () => {
      const payload = createApplicationPayload();
      const signature = generateWebhookSignature(payload, webhookSecret);

      const mockPerson = {
        id: 'gc-failed-person',
        email: 'test@example.com',
        generalCompetenciesCompleted: true,
      };
      const mockApplication = {
        id: 'app-rejected',
        personId: 'gc-failed-person',
        position: 'Software Developer',
        currentStage: 'APPLICATION',
        status: 'ACTIVE',
        hasResume: false,
        hasAcademicBg: false,
        hasVideoIntro: false,
        hasPreviousExp: false,
        hasOtherFile: false,
        resumeUrl: null,
        academicBackground: null,
        videoLink: null,
        previousExperience: null,
        otherFileUrl: null,
      };

      (getApplicationByTallySubmissionId as jest.Mock).mockResolvedValue(null);
      (findOrCreatePerson as jest.Mock).mockResolvedValue({
        person: mockPerson,
        created: false,
      });
      (createApplication as jest.Mock).mockResolvedValue(mockApplication);
      (hasPassedGeneralCompetencies as jest.Mock).mockResolvedValue(false);

      const request = createRequest(payload, signature);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.nextStep).toBe('reject');
      expect(updateApplicationStatus).toHaveBeenCalledWith('app-rejected', 'REJECTED');
    });
  });

  describe('Idempotency', () => {
    it('returns success for duplicate submission without reprocessing', async () => {
      const payload = createApplicationPayload({ submissionId: 'duplicate-sub-123' });
      const signature = generateWebhookSignature(payload, webhookSecret);

      (getApplicationByTallySubmissionId as jest.Mock).mockResolvedValue({
        id: 'existing-app',
        personId: 'person-123',
      });

      const request = createRequest(payload, signature);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain('Duplicate');
      expect(data.applicationId).toBe('existing-app');
      expect(findOrCreatePerson).not.toHaveBeenCalled();
      expect(createApplication).not.toHaveBeenCalled();
    });
  });

  describe('Validation errors', () => {
    it('returns 400 for missing required fields', async () => {
      const payload = createInvalidPayload();
      const signature = generateWebhookSignature(payload, webhookSecret);

      (getApplicationByTallySubmissionId as jest.Mock).mockResolvedValue(null);

      const request = createRequest(payload, signature);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });

    it('returns 400 for invalid JSON', async () => {
      // Sign the invalid JSON so signature verification passes
      const invalidBody = 'not valid json';
      const signature = generateWebhookSignature(invalidBody, webhookSecret);

      const headers = new Headers({
        'content-type': 'application/json',
        'x-forwarded-for': '192.168.1.1',
        'x-webhook-secret': signature,
      });
      const request = new NextRequest('http://localhost/api/webhooks/tally/application', {
        method: 'POST',
        headers,
        body: invalidBody,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
    });

    it('returns 400 for invalid payload structure', async () => {
      const payload = { invalid: 'structure' };
      const signature = generateWebhookSignature(payload, webhookSecret);

      const request = createRequest(payload, signature);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid payload');
    });
  });

  describe('Authentication', () => {
    it('returns 401 for invalid secret in production', async () => {
      setNodeEnv('production');
      process.env.TALLY_WEBHOOK_IP_WHITELIST = '0.0.0.0/0'; // Allow all IPs for this test

      const payload = createApplicationPayload();
      const request = createRequest(payload, 'wrong-secret');

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Invalid webhook secret');
    });

    it('returns 401 for missing secret header in production', async () => {
      setNodeEnv('production');
      process.env.TALLY_WEBHOOK_IP_WHITELIST = '0.0.0.0/0';

      const payload = createApplicationPayload();
      const request = createRequest(payload);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Missing x-webhook-secret header');
    });
  });

  describe('Rate limiting', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const payload = createApplicationPayload();
      const signature = generateWebhookSignature(payload, webhookSecret);

      // Exhaust rate limit (100 requests)
      for (let i = 0; i < 100; i++) {
        const req = createRequest(
          createApplicationPayload({ submissionId: `sub-${i}` }),
          generateWebhookSignature(createApplicationPayload({ submissionId: `sub-${i}` }), webhookSecret)
        );
        // Mock to return early so we don't hit DB
        (getApplicationByTallySubmissionId as jest.Mock).mockResolvedValue({ id: `app-${i}` });
        await POST(req);
      }

      // 101st request should be rate limited
      const request = createRequest(payload, signature);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Rate limit');
    });

    it('includes rate limit headers in response', async () => {
      const payload = createApplicationPayload();
      const signature = generateWebhookSignature(payload, webhookSecret);

      (getApplicationByTallySubmissionId as jest.Mock).mockResolvedValue({ id: 'existing' });

      const request = createRequest(payload, signature);
      const response = await POST(request);

      expect(response.headers.get('X-RateLimit-Remaining')).toBeDefined();
      expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
    });
  });

  describe('Missing fields detection', () => {
    it('detects missing files that were claimed to be uploaded', async () => {
      const payload = createApplicationPayload();
      // Modify to claim files but not provide them
      const fieldsWithoutFiles = payload.data.fields.map((f) => {
        if (f.key === APPLICATION_FIELD_KEYS.resumeFile) {
          return { ...f, value: [] }; // Empty file upload
        }
        return f;
      });
      payload.data.fields = fieldsWithoutFiles;

      const signature = generateWebhookSignature(payload, webhookSecret);

      const mockApplication = {
        id: 'app-missing-files',
        hasResume: true, // Claimed to have resume
        hasAcademicBg: false,
        hasVideoIntro: false,
        hasPreviousExp: false,
        hasOtherFile: false,
        resumeUrl: null, // But no URL
        currentStage: 'APPLICATION',
        status: 'ACTIVE',
        position: 'Software Developer',
        academicBackground: null,
        videoLink: null,
        previousExperience: null,
        otherFileUrl: null,
      };

      (getApplicationByTallySubmissionId as jest.Mock).mockResolvedValue(null);
      (findOrCreatePerson as jest.Mock).mockResolvedValue({
        person: { id: 'person-123', generalCompetenciesCompleted: false },
        created: true,
      });
      (createApplication as jest.Mock).mockResolvedValue(mockApplication);

      const request = createRequest(payload, signature);
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.missingFields).toContain('Resume');
    });
  });
});

describe('OPTIONS /api/webhooks/tally/application', () => {
  it('returns CORS headers', async () => {
    const response = await OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('x-webhook-secret');
  });
});
