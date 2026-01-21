/**
 * Applications API Route Tests
 *
 * Tests for the /api/applications endpoint.
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
  getApplications: jest.fn(),
  getApplicationStats: jest.fn(),
  getApplicationsForPipeline: jest.fn(),
}));

// Mock security
jest.mock('@/lib/security', () => ({
  sanitizeForLog: jest.fn((s) => s),
}));

import { GET } from '@/app/api/applications/route';
import { auth } from '@/lib/auth';
import { getApplications, getApplicationStats, getApplicationsForPipeline } from '@/lib/services/applications';

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

const mockApplications = [
  {
    id: 'app-1',
    personId: 'person-1',
    position: 'Software Engineer',
    currentStage: 'INTERVIEW',
    status: 'ACTIVE',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-15'),
    person: {
      id: 'person-1',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
      generalCompetenciesCompleted: true,
      generalCompetenciesScore: '85.00',
    },
    _count: { interviews: 1, decisions: 0 },
  },
];

const mockApplicationsResult = {
  applications: mockApplications,
  total: 1,
  page: 1,
  limit: 20,
  totalPages: 1,
};

const mockStats = {
  total: 10,
  active: 5,
  byStage: {
    APPLICATION: 2,
    GENERAL_COMPETENCIES: 1,
    SPECIALIZED_COMPETENCIES: 1,
    INTERVIEW: 1,
    AGREEMENT: 0,
    SIGNED: 0,
  },
  byStatus: {
    ACTIVE: 5,
    ACCEPTED: 2,
    REJECTED: 2,
    WITHDRAWN: 1,
  },
  byPosition: { 'Software Engineer': 5, 'Data Analyst': 5 },
  awaitingAction: 3,
  recentActivity: 8,
};

const mockPipelineData = {
  applicationsByStage: {
    APPLICATION: [],
    GENERAL_COMPETENCIES: [],
    SPECIALIZED_COMPETENCIES: [],
    INTERVIEW: [],
    AGREEMENT: [],
    SIGNED: [],
  },
  stats: mockStats,
};

describe('GET /api/applications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getApplications as jest.Mock).mockResolvedValue(mockApplicationsResult);
    (getApplicationStats as jest.Mock).mockResolvedValue(mockStats);
    (getApplicationsForPipeline as jest.Mock).mockResolvedValue(mockPipelineData);
  });

  it('returns 401 when not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/applications');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 for users without app access', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthNoAccess);

    const request = new NextRequest('http://localhost:3000/api/applications');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden - App access required');
  });

  it('returns applications for admin users', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = new NextRequest('http://localhost:3000/api/applications');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.applications).toHaveLength(1);
    expect(data.applications[0].id).toBe('app-1');
    expect(data.applications[0].position).toBe('Software Engineer');
    expect(data.total).toBe(1);
    expect(data.stats).toEqual(mockStats);
  });

  it('returns applications for hiring managers', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthHiringManager);

    const request = new NextRequest('http://localhost:3000/api/applications');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.applications).toHaveLength(1);
    expect(data.applications[0].id).toBe('app-1');
  });

  it('returns pipeline view when view=pipeline', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = new NextRequest('http://localhost:3000/api/applications?view=pipeline');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.applicationsByStage).toBeDefined();
    expect(getApplicationsForPipeline).toHaveBeenCalled();
  });

  it('passes search parameter', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = new NextRequest('http://localhost:3000/api/applications?search=john');
    await GET(request);

    expect(getApplications).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'john',
      })
    );
  });

  it('validates and passes personId filter', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);
    const validPersonId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

    const request = new NextRequest(`http://localhost:3000/api/applications?personId=${validPersonId}`);
    await GET(request);

    expect(getApplications).toHaveBeenCalledWith(
      expect.objectContaining({
        personId: validPersonId,
      })
    );
  });

  it('returns 400 for invalid personId format', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = new NextRequest('http://localhost:3000/api/applications?personId=not-a-uuid');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid personId format');
  });

  it('passes stage filter', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = new NextRequest('http://localhost:3000/api/applications?stage=INTERVIEW');
    await GET(request);

    expect(getApplications).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'INTERVIEW',
      })
    );
  });

  it('ignores invalid stage values', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = new NextRequest('http://localhost:3000/api/applications?stage=INVALID');
    await GET(request);

    expect(getApplications).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: undefined,
      })
    );
  });

  it('passes status filter', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = new NextRequest('http://localhost:3000/api/applications?status=ACTIVE');
    await GET(request);

    expect(getApplications).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ACTIVE',
      })
    );
  });

  it('passes pagination parameters', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = new NextRequest('http://localhost:3000/api/applications?page=2&limit=50');
    await GET(request);

    expect(getApplications).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        limit: 50,
      })
    );
  });

  it('enforces maximum limit of 100', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = new NextRequest('http://localhost:3000/api/applications?limit=500');
    await GET(request);

    expect(getApplications).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 100,
      })
    );
  });

  it('passes sort parameters', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = new NextRequest('http://localhost:3000/api/applications?sortBy=position&sortOrder=asc');
    await GET(request);

    expect(getApplications).toHaveBeenCalledWith(
      expect.objectContaining({
        sortBy: 'position',
        sortOrder: 'asc',
      })
    );
  });

  it('defaults to createdAt desc for invalid sort params', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = new NextRequest('http://localhost:3000/api/applications?sortBy=invalid&sortOrder=invalid');
    await GET(request);

    expect(getApplications).toHaveBeenCalledWith(
      expect.objectContaining({
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
    );
  });

  it('returns 500 on error', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);
    (getApplications as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/applications');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
