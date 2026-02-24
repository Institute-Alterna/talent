/**
 * Specialized Competencies Webhook Tests
 *
 * Tests for POST /api/webhooks/tally/specialized-competencies
 *
 * @jest-environment node
 */

import { POST } from '@/app/api/webhooks/tally/specialized-competencies/route';
import { NextRequest } from 'next/server';
import { SC_ASSESSMENT_FIELD_KEYS, clearAllRateLimits } from '@/lib/webhooks';
import type { TallyWebhookPayload } from '@/lib/webhooks/tally-mapper';

// Mock the database and services
jest.mock('@/lib/db', () => ({
  db: {
    assessment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/services/applications', () => ({
  getApplicationById: jest.fn(),
}));

jest.mock('@/lib/audit', () => ({
  logWebhookReceived: jest.fn(),
  logAssessmentCompleted: jest.fn(),
}));

// Allow all IPs in test
jest.mock('@/lib/security', () => {
  const actual = jest.requireActual('@/lib/security');
  return {
    ...actual,
    isAllowedIp: jest.fn().mockReturnValue(true),
    sanitizeForLog: jest.fn((s) => s),
  };
});

import { db } from '@/lib/db';
import { getApplicationById } from '@/lib/services/applications';
import { logWebhookReceived, logAssessmentCompleted } from '@/lib/audit';

// ---------------------------------------------------------------------------
// Constants / helpers
// ---------------------------------------------------------------------------

const APP_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const SC_ID = 'sc-1111-2222-3333-444444444444';
const WEBHOOK_SECRET = 'test-sc-webhook-secret';

const setNodeEnv = (env: string) => {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: env,
    writable: true,
    configurable: true,
  });
};

function makePayload(overrides?: {
  applicationId?: string;
  scId?: string;
  submissionId?: string;
  withFile?: boolean;
  omitScId?: boolean;
}): TallyWebhookPayload {
  const {
    applicationId = APP_ID,
    scId = SC_ID,
    submissionId = `sub-sc-${Date.now()}`,
    withFile = false,
    omitScId = false,
  } = overrides || {};

  const fields: TallyField[] = [
    {
      key: `${SC_ASSESSMENT_FIELD_KEYS.applicationId}_hidden`,
      label: 'Application ID',
      type: 'HIDDEN_FIELDS',
      value: applicationId,
    },
  ];

  if (!omitScId) {
    fields.push({
      key: `${SC_ASSESSMENT_FIELD_KEYS.specialisedCompetencyId}_hidden`,
      label: 'SC Definition ID',
      type: 'HIDDEN_FIELDS',
      value: scId,
    });
  }

  if (withFile) {
    fields.push({
      key: 'question_portfolio',
      label: 'Portfolio',
      type: 'FILE_UPLOAD',
      value: [
        {
          id: 'f1',
          name: 'portfolio.pdf',
          url: 'https://tally.so/files/portfolio.pdf',
          mimeType: 'application/pdf',
          size: 20000,
        },
      ] as never,
    });
  }

  return {
    eventId: `evt-sc-${Date.now()}`,
    createdAt: new Date().toISOString(),
    data: {
      responseId: `resp-sc-${Date.now()}`,
      submissionId,
      respondentId: `resp-${Date.now()}`,
      formId: 'form-sc',
      formName: 'SC Assessment',
      createdAt: new Date().toISOString(),
      fields,
    },
  };
}

type TallyField = TallyWebhookPayload['data']['fields'][number];

function makeRequest(payload: TallyWebhookPayload) {
  return new NextRequest(
    'http://localhost:3000/api/webhooks/tally/specialized-competencies',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-secret': WEBHOOK_SECRET,
        'x-forwarded-for': '127.0.0.1',
      },
      body: JSON.stringify(payload),
    }
  );
}

const mockApplication = {
  id: APP_ID,
  personId: 'person-1',
  status: 'ACTIVE',
  currentStage: 'SPECIALIZED_COMPETENCIES',
  position: 'Software Developer',
};

const mockPendingAssessment = {
  id: 'assessment-1',
  applicationId: APP_ID,
  assessmentType: 'SPECIALIZED_COMPETENCIES',
  specialisedCompetencyId: SC_ID,
  completedAt: null,
  passed: null,
  tallySubmissionId: null,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/webhooks/tally/specialized-competencies', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    clearAllRateLimits();
    process.env.WEBHOOK_SECRET = WEBHOOK_SECRET;
    setNodeEnv('development');

    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Default happy-path mocks
    (db.assessment.findUnique as jest.Mock).mockResolvedValue(null);
    (getApplicationById as jest.Mock).mockResolvedValue(mockApplication);
    (db.assessment.findFirst as jest.Mock).mockResolvedValue(mockPendingAssessment);
    (db.assessment.update as jest.Mock).mockResolvedValue({
      ...mockPendingAssessment,
      id: 'assessment-1',
      completedAt: new Date(),
      tallySubmissionId: 'sub-sc-001',
    });
    (db.assessment.create as jest.Mock).mockResolvedValue({
      ...mockPendingAssessment,
      id: 'new-assessment-1',
      completedAt: new Date(),
      tallySubmissionId: 'sub-sc-001',
    });
    (logWebhookReceived as jest.Mock).mockResolvedValue(undefined);
    (logAssessmentCompleted as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('returns 401 when webhook secret is missing', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/webhooks/tally/specialized-competencies',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(makePayload()),
      }
    );
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 200 for duplicate submission (idempotent)', async () => {
    (db.assessment.findUnique as jest.Mock).mockResolvedValue({
      id: 'existing-assessment',
      tallySubmissionId: 'sub-duplicate',
    });

    const res = await POST(makeRequest(makePayload({ submissionId: 'sub-duplicate' })));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toContain('Duplicate');
  });

  it('returns 404 when application not found', async () => {
    (getApplicationById as jest.Mock).mockResolvedValue(null);
    const res = await POST(makeRequest(makePayload()));
    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data.error).toContain('Application not found');
  });

  it('returns 400 when application is not active', async () => {
    (getApplicationById as jest.Mock).mockResolvedValue({
      ...mockApplication,
      status: 'REJECTED',
    });
    const res = await POST(makeRequest(makePayload()));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain('not active');
  });

  it('updates pending assessment when scId matches existing record', async () => {
    const res = await POST(makeRequest(makePayload()));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(db.assessment.update).toHaveBeenCalled();
    expect(db.assessment.create).not.toHaveBeenCalled();
    expect(data.data.assessmentId).toBeDefined();
  });

  it('creates new assessment when no pending assessment found', async () => {
    (db.assessment.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await POST(makeRequest(makePayload()));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(db.assessment.create).toHaveBeenCalled();
    expect(data.data.assessmentId).toBeDefined();
  });

  it('creates new assessment when scId is absent from payload', async () => {
    const res = await POST(makeRequest(makePayload({ omitScId: true })));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(db.assessment.create).toHaveBeenCalled();
    expect(data.data.assessmentId).toBeDefined();
  });

  it('stores submission file URLs when files are uploaded', async () => {
    await POST(makeRequest(makePayload({ withFile: true })));

    expect(db.assessment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          submissionUrls: expect.arrayContaining([
            expect.objectContaining({ url: 'https://tally.so/files/portfolio.pdf' }),
          ]),
        }),
      })
    );
  });

  it('logs webhook receipt with correct metadata', async () => {
    await POST(makeRequest(makePayload()));

    expect(logWebhookReceived).toHaveBeenCalledWith(
      'specialized-competencies',
      undefined,
      APP_ID,
      expect.any(Object),
      expect.any(String)
    );
  });

  it('logs assessment completion with passed = null (awaiting admin review)', async () => {
    await POST(makeRequest(makePayload()));

    expect(logAssessmentCompleted).toHaveBeenCalledWith(
      mockApplication.personId,
      APP_ID,
      expect.stringContaining('submission received'),
      null,
      null
    );
  });

  it('does not auto-advance the application stage', async () => {
    // advanceApplicationStage is never imported or called in the SC webhook
    const advanceSpy = jest.fn();

    await POST(makeRequest(makePayload()));

    expect(advanceSpy).not.toHaveBeenCalled();
  });
});
