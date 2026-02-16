/**
 * Application Detail API Route Tests
 *
 * Tests for the /api/applications/[id] endpoint.
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
  updateApplication: jest.fn(),
  updateApplicationStatus: jest.fn(),
}));

// Mock audit
jest.mock('@/lib/audit', () => ({
  logRecordViewed: jest.fn(),
  logStageChange: jest.fn(),
  logStatusChange: jest.fn(),
  logRecordDeleted: jest.fn(),
}));

// Mock security
jest.mock('@/lib/security', () => {
  const actual = jest.requireActual('@/lib/security');
  return {
    ...actual,
    sanitizeForLog: jest.fn((s) => s),
  };
});

import { GET, PATCH, DELETE } from '@/app/api/applications/[id]/route';
import { auth } from '@/lib/auth';
import { getApplicationDetail, updateApplication, updateApplicationStatus } from '@/lib/services/applications';
import { logRecordViewed, logStageChange, logStatusChange, logRecordDeleted } from '@/lib/audit';

const mockAuthAdmin = {
  user: {
    id: 'user-1',
    email: 'admin@alterna.dev',
    name: 'Admin User',
    isAdmin: true,
    hasAccess: true,
    dbUserId: 'db-user-1',
  },
};

const mockAuthHiringManager = {
  user: {
    id: 'user-2',
    email: 'hiring@alterna.dev',
    name: 'Hiring Manager',
    isAdmin: false,
    hasAccess: true,
    dbUserId: 'db-user-2',
  },
};

const mockAuthNoAccess = {
  user: {
    id: 'user-3',
    email: 'noaccess@alterna.dev',
    name: 'No Access User',
    isAdmin: false,
    hasAccess: false,
    dbUserId: 'db-user-3',
  },
};

const mockAppId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const mockInvalidId = 'not-a-uuid';

const mockApplication = {
  id: mockAppId,
  personId: 'person-1',
  position: 'Software Engineer',
  currentStage: 'INTERVIEW',
  status: 'ACTIVE',
  resumeUrl: 'https://example.com/resume.pdf',
  academicBackground: 'CS degree',
  previousExperience: '5 years',
  videoLink: 'https://youtube.com/video',
  otherFileUrl: null,
  hasResume: true,
  hasAcademicBg: true,
  hasVideoIntro: true,
  hasPreviousExp: true,
  hasOtherFile: false,
  tallySubmissionId: 'tally-123',
  tallyResponseId: 'response-123',
  tallyFormId: 'form-123',
  createdAt: new Date('2024-01-05'),
  updatedAt: new Date('2024-01-15'),
  person: {
    id: 'person-1',
    email: 'john@example.com',
    firstName: 'John',
    middleName: null,
    lastName: 'Doe',
    secondaryEmail: null,
    phoneNumber: '+1234567890',
    country: 'US',
    city: 'New York',
    state: 'NY',
    countryCode: 'US',
    portfolioLink: 'https://portfolio.example.com',
    educationLevel: 'Bachelor',
    generalCompetenciesCompleted: true,
    generalCompetenciesScore: '85.00',
    generalCompetenciesPassedAt: new Date('2024-01-10'),
  },
  assessments: [],
  interviews: [],
  decisions: [],
};

describe('GET /api/applications/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getApplicationDetail as jest.Mock).mockResolvedValue(mockApplication);
    (logRecordViewed as jest.Mock).mockResolvedValue(undefined);
  });

  const createRequest = (id: string) => {
    return new NextRequest(`http://localhost:3000/api/applications/${id}`);
  };

  const createParams = (id: string) => Promise.resolve({ id });

  it('returns 400 for invalid UUID format', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = createRequest(mockInvalidId);
    const response = await GET(request, { params: createParams(mockInvalidId) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid application ID format');
  });

  it('returns 401 when not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = createRequest(mockAppId);
    const response = await GET(request, { params: createParams(mockAppId) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 for users without app access', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthNoAccess);

    const request = createRequest(mockAppId);
    const response = await GET(request, { params: createParams(mockAppId) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden - App access required');
  });

  it('returns 404 when application not found', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);
    (getApplicationDetail as jest.Mock).mockResolvedValue(null);

    const request = createRequest(mockAppId);
    const response = await GET(request, { params: createParams(mockAppId) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Application not found');
  });

  it('returns application details', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = createRequest(mockAppId);
    const response = await GET(request, { params: createParams(mockAppId) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.application.id).toBe(mockAppId);
    expect(data.application.position).toBe('Software Engineer');
    expect(data.application.currentStage).toBe('INTERVIEW');
    expect(data.application.status).toBe('ACTIVE');
    expect(data.application.person.email).toBe('john@example.com');
    expect(data.missingFields).toEqual([]);
  });

  it('reports missing fields correctly', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);
    (getApplicationDetail as jest.Mock).mockResolvedValue({
      ...mockApplication,
      hasResume: true,
      resumeUrl: null, // Missing
      hasOtherFile: true,
      otherFileUrl: null, // Missing
    });

    const request = createRequest(mockAppId);
    const response = await GET(request, { params: createParams(mockAppId) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.missingFields).toContain('Resume');
    expect(data.missingFields).toContain('Other File');
  });

  it('logs record view for GDPR', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = createRequest(mockAppId);
    await GET(request, { params: createParams(mockAppId) });

    expect(logRecordViewed).toHaveBeenCalledWith(
      mockApplication.personId,
      mockApplication.id,
      mockAuthAdmin.user.dbUserId,
      'application_detail'
    );
  });
});

describe('PATCH /api/applications/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getApplicationDetail as jest.Mock).mockResolvedValue(mockApplication);
    (updateApplication as jest.Mock).mockResolvedValue({ ...mockApplication, currentStage: 'AGREEMENT' });
    (logStageChange as jest.Mock).mockResolvedValue(undefined);
    (logStatusChange as jest.Mock).mockResolvedValue(undefined);
  });

  const createRequest = (id: string, body: object) => {
    return new NextRequest(`http://localhost:3000/api/applications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  };

  const createParams = (id: string) => Promise.resolve({ id });

  it('returns 400 for invalid UUID format', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = createRequest(mockInvalidId, { status: 'REJECTED' });
    const response = await PATCH(request, { params: createParams(mockInvalidId) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid application ID format');
  });

  it('returns 401 when not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = createRequest(mockAppId, { status: 'REJECTED' });
    const response = await PATCH(request, { params: createParams(mockAppId) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 for users without app access', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthNoAccess);

    const request = createRequest(mockAppId, { status: 'REJECTED' });
    const response = await PATCH(request, { params: createParams(mockAppId) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden - App access required');
  });

  it('returns 403 when hiring manager tries to change stage', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthHiringManager);

    const request = createRequest(mockAppId, { currentStage: 'AGREEMENT' });
    const response = await PATCH(request, { params: createParams(mockAppId) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden - Admin access required for stage/status changes');
  });

  it('returns 403 when hiring manager tries to change status', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthHiringManager);

    const request = createRequest(mockAppId, { status: 'REJECTED' });
    const response = await PATCH(request, { params: createParams(mockAppId) });
    await response.json();

    expect(response.status).toBe(403);
  });

  it('allows admin to change stage', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = createRequest(mockAppId, { currentStage: 'AGREEMENT' });
    const response = await PATCH(request, { params: createParams(mockAppId) });
    await response.json();

    expect(response.status).toBe(200);
    expect(updateApplication).toHaveBeenCalledWith(mockAppId, { currentStage: 'AGREEMENT' });
    expect(logStageChange).toHaveBeenCalled();
  });

  it('validates stage value', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = createRequest(mockAppId, { currentStage: 'INVALID_STAGE' });
    const response = await PATCH(request, { params: createParams(mockAppId) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid stage');
  });

  it('validates status value', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = createRequest(mockAppId, { status: 'INVALID_STATUS' });
    const response = await PATCH(request, { params: createParams(mockAppId) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid status');
  });

  it('validates URL format for resumeUrl', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = createRequest(mockAppId, { resumeUrl: 'not-a-url' });
    const response = await PATCH(request, { params: createParams(mockAppId) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid resumeUrl format');
  });

  it('allows null for URL fields', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = createRequest(mockAppId, { resumeUrl: null });
    const response = await PATCH(request, { params: createParams(mockAppId) });

    expect(response.status).toBe(200);
    expect(updateApplication).toHaveBeenCalledWith(mockAppId, { resumeUrl: null });
  });

  it('returns 400 when no valid fields to update', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = createRequest(mockAppId, { invalidField: 'value' });
    const response = await PATCH(request, { params: createParams(mockAppId) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('No valid fields to update');
  });
});

describe('DELETE /api/applications/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getApplicationDetail as jest.Mock).mockResolvedValue(mockApplication);
    (updateApplicationStatus as jest.Mock).mockResolvedValue({ ...mockApplication, status: 'WITHDRAWN' });
    (logRecordDeleted as jest.Mock).mockResolvedValue(undefined);
    (logStatusChange as jest.Mock).mockResolvedValue(undefined);
  });

  const createRequest = (id: string, body?: object) => {
    const init: { method: string; headers?: Record<string, string>; body?: string } = { method: 'DELETE' };
    if (body) {
      init.headers = { 'Content-Type': 'application/json' };
      init.body = JSON.stringify(body);
    }
    return new NextRequest(`http://localhost:3000/api/applications/${id}`, init);
  };

  const createParams = (id: string) => Promise.resolve({ id });

  it('returns 400 for invalid UUID format', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = createRequest(mockInvalidId);
    const response = await DELETE(request, { params: createParams(mockInvalidId) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid application ID format');
  });

  it('returns 401 when not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = createRequest(mockAppId);
    const response = await DELETE(request, { params: createParams(mockAppId) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 for non-admin users', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthHiringManager);

    const request = createRequest(mockAppId);
    const response = await DELETE(request, { params: createParams(mockAppId) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden - Admin access required');
  });

  it('returns 404 when application not found', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);
    (getApplicationDetail as jest.Mock).mockResolvedValue(null);

    const request = createRequest(mockAppId);
    const response = await DELETE(request, { params: createParams(mockAppId) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Application not found');
  });

  it('returns 400 if application is already withdrawn', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);
    (getApplicationDetail as jest.Mock).mockResolvedValue({ ...mockApplication, status: 'WITHDRAWN' });

    const request = createRequest(mockAppId);
    const response = await DELETE(request, { params: createParams(mockAppId) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Application is already withdrawn');
  });

  it('soft deletes by setting status to WITHDRAWN', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = createRequest(mockAppId);
    const response = await DELETE(request, { params: createParams(mockAppId) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(updateApplicationStatus).toHaveBeenCalledWith(mockAppId, 'WITHDRAWN');
    expect(logRecordDeleted).toHaveBeenCalled();
    expect(logStatusChange).toHaveBeenCalled();
  });

  it('accepts optional reason in body', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = createRequest(mockAppId, { reason: 'Candidate requested withdrawal' });
    const response = await DELETE(request, { params: createParams(mockAppId) });

    expect(response.status).toBe(200);
    expect(logRecordDeleted).toHaveBeenCalledWith(
      'Application',
      mockAppId,
      mockApplication.personId,
      mockAppId,
      mockAuthAdmin.user.dbUserId,
      'Candidate requested withdrawal'
    );
  });
});
