/**
 * Review SC Assessment API Route Tests
 *
 * Unit tests for POST /api/applications/[id]/review-sc
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock applications service
jest.mock('@/lib/services/applications', () => ({
  getApplicationDetail: jest.fn(),
}));

// Mock database
jest.mock('@/lib/db', () => ({
  db: {
    assessment: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock audit
jest.mock('@/lib/audit', () => ({
  logAssessmentCompleted: jest.fn(),
}));

// Mock security
jest.mock('@/lib/security', () => {
  const actual = jest.requireActual('@/lib/security');
  return { ...actual, sanitizeForLog: jest.fn((s) => s) };
});

import { POST } from '@/app/api/applications/[id]/review-sc/route';
import { auth } from '@/lib/auth';
import { getApplicationDetail } from '@/lib/services/applications';
import { db } from '@/lib/db';
import { logAssessmentCompleted } from '@/lib/audit';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const appId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const assessmentId = 'b1b2c3d4-e5f6-7890-abcd-ef1234567891';
const invalidId = 'not-a-uuid';

const mockAdmin = {
  user: {
    id: 'user-1',
    dbUserId: 'db-user-1',
    email: 'admin@example.com',
    name: 'Admin',
    isAdmin: true,
    hasAccess: true,
  },
};

const mockHiringManager = {
  user: {
    id: 'user-2',
    dbUserId: 'db-user-2',
    email: 'hm@example.com',
    name: 'HM',
    isAdmin: false,
    hasAccess: true,
  },
};

const mockApplication = {
  id: appId,
  personId: 'person-1',
  position: 'Software Engineer',
  currentStage: 'SPECIALIZED_COMPETENCIES',
  status: 'ACTIVE',
  person: {
    id: 'person-1',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
  },
};

const mockAssessment = {
  id: assessmentId,
  applicationId: appId,
  assessmentType: 'SPECIALIZED_COMPETENCIES',
  completedAt: new Date('2025-06-01'),
  passed: null,
  reviewedAt: null,
  reviewedBy: null,
  specialisedCompetencyId: 'sc-1111-2222-3333-444444444444',
};

const makeRequest = (body: Record<string, unknown>) =>
  new NextRequest(`http://localhost:3000/api/applications/${appId}/review-sc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const makeParams = (id: string) => Promise.resolve({ id });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/applications/[id]/review-sc', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (auth as jest.Mock).mockResolvedValue(mockAdmin);
    (getApplicationDetail as jest.Mock).mockResolvedValue(mockApplication);
    (db.assessment.findFirst as jest.Mock).mockResolvedValue(mockAssessment);
    (db.assessment.update as jest.Mock).mockResolvedValue({
      ...mockAssessment,
      passed: true,
      reviewedAt: new Date(),
      reviewedBy: 'db-user-1',
    });
    (logAssessmentCompleted as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => consoleSpy.mockRestore());

  it('returns 401 when unauthenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    const res = await POST(makeRequest({ assessmentId, passed: true }), {
      params: makeParams(appId),
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin users', async () => {
    (auth as jest.Mock).mockResolvedValue(mockHiringManager);
    const res = await POST(makeRequest({ assessmentId, passed: true }), {
      params: makeParams(appId),
    });
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid application UUID', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAdmin);
    const res = await POST(makeRequest({ assessmentId, passed: true }), {
      params: makeParams(invalidId),
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 when application not found', async () => {
    (getApplicationDetail as jest.Mock).mockResolvedValue(null);
    const res = await POST(makeRequest({ assessmentId, passed: true }), {
      params: makeParams(appId),
    });
    expect(res.status).toBe(404);
  });

  it('returns 400 when assessmentId is missing', async () => {
    const res = await POST(makeRequest({ passed: true }), { params: makeParams(appId) });
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain('assessmentId');
  });

  it('returns 400 when assessmentId is not a UUID', async () => {
    const res = await POST(makeRequest({ assessmentId: 'bad-id', passed: true }), {
      params: makeParams(appId),
    });
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain('assessmentId');
  });

  it('returns 400 when passed is not a boolean', async () => {
    const res = await POST(makeRequest({ assessmentId, passed: 'yes' }), {
      params: makeParams(appId),
    });
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain('passed must be a boolean');
  });

  it('returns 404 when assessment not found for application', async () => {
    (db.assessment.findFirst as jest.Mock).mockResolvedValue(null);
    const res = await POST(makeRequest({ assessmentId, passed: true }), {
      params: makeParams(appId),
    });
    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data.error).toContain('Assessment not found');
  });

  it('returns 400 when assessment has not been submitted yet', async () => {
    (db.assessment.findFirst as jest.Mock).mockResolvedValue({
      ...mockAssessment,
      completedAt: null,
    });
    const res = await POST(makeRequest({ assessmentId, passed: true }), {
      params: makeParams(appId),
    });
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain('not been submitted');
  });

  it('marks assessment as passed and returns 200', async () => {
    const res = await POST(makeRequest({ assessmentId, passed: true }), {
      params: makeParams(appId),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.assessment.passed).toBe(true);
    expect(db.assessment.update).toHaveBeenCalledWith({
      where: { id: assessmentId },
      data: {
        passed: true,
        reviewedAt: expect.any(Date),
        reviewedBy: 'db-user-1',
      },
    });
  });

  it('marks assessment as failed and returns 200', async () => {
    (db.assessment.update as jest.Mock).mockResolvedValue({
      ...mockAssessment,
      passed: false,
      reviewedAt: new Date(),
      reviewedBy: 'db-user-1',
    });

    const res = await POST(makeRequest({ assessmentId, passed: false }), {
      params: makeParams(appId),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.assessment.passed).toBe(false);
  });

  it('logs the review decision as approved', async () => {
    await POST(makeRequest({ assessmentId, passed: true }), {
      params: makeParams(appId),
    });

    expect(logAssessmentCompleted).toHaveBeenCalledWith(
      mockApplication.personId,
      appId,
      expect.stringContaining('approved'),
      null,
      true
    );
  });

  it('logs rejection when passed is false', async () => {
    (db.assessment.update as jest.Mock).mockResolvedValue({
      ...mockAssessment,
      passed: false,
      reviewedAt: new Date(),
      reviewedBy: 'db-user-1',
    });

    await POST(makeRequest({ assessmentId, passed: false }), {
      params: makeParams(appId),
    });

    expect(logAssessmentCompleted).toHaveBeenCalledWith(
      expect.any(String),
      appId,
      expect.stringContaining('rejected'),
      null,
      false
    );
  });

  it('returns 500 on unexpected error', async () => {
    (db.assessment.findFirst as jest.Mock).mockRejectedValue(new Error('DB error'));
    const res = await POST(makeRequest({ assessmentId, passed: true }), {
      params: makeParams(appId),
    });
    const data = await res.json();
    expect(res.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
