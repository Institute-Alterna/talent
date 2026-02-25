/**
 * Dashboard API Route Tests
 *
 * Tests for the dashboard metrics endpoint.
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

// Define enums locally to avoid import issues
const Stage = {
  APPLICATION: 'APPLICATION' as const,
  GENERAL_COMPETENCIES: 'GENERAL_COMPETENCIES' as const,
  SPECIALIZED_COMPETENCIES: 'SPECIALIZED_COMPETENCIES' as const,
  INTERVIEW: 'INTERVIEW' as const,
  AGREEMENT: 'AGREEMENT' as const,
  SIGNED: 'SIGNED' as const,
};

const Status = {
  ACTIVE: 'ACTIVE' as const,
  ACCEPTED: 'ACCEPTED' as const,
  REJECTED: 'REJECTED' as const,
};

const ActionType = {
  CREATE: 'CREATE' as const,
  UPDATE: 'UPDATE' as const,
  DELETE: 'DELETE' as const,
  VIEW: 'VIEW' as const,
  EMAIL_SENT: 'EMAIL_SENT' as const,
  STATUS_CHANGE: 'STATUS_CHANGE' as const,
  STAGE_CHANGE: 'STAGE_CHANGE' as const,
};

// Mock the auth module
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock the db module
jest.mock('@/lib/db', () => ({
  db: {
    application: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    person: {
      count: jest.fn(),
    },
  },
}));

// Mock the audit module
jest.mock('@/lib/audit', () => ({
  getRecentAuditLogs: jest.fn(),
}));

// Mock security
jest.mock('@/lib/security', () => ({
  sanitizeForLog: jest.fn((s) => s),
}));

// Mock the applications service — provides getAttentionBreakdown used by dashboard route
jest.mock('@/lib/services/applications', () => ({
  getAttentionBreakdown: jest.fn(),
}));

// Import after mocks are set up
import { GET } from '@/app/api/dashboard/route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getRecentAuditLogs } from '@/lib/audit';
import { getAttentionBreakdown } from '@/lib/services/applications';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAuth = auth as jest.MockedFunction<any>;
const mockDb = db as jest.Mocked<typeof db>;
const mockGetRecentAuditLogs = getRecentAuditLogs as jest.MockedFunction<typeof getRecentAuditLogs>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetAttentionBreakdown = getAttentionBreakdown as jest.MockedFunction<any>;

const zeroBreakdown = { awaitingGC: 0, gcFailedPendingRejection: 0, awaitingSC: 0, pendingInterviews: 0, pendingAgreement: 0, total: 0 };

describe('Dashboard API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: getAttentionBreakdown returns zeros (overridden per test as needed)
    mockGetAttentionBreakdown.mockResolvedValue(zeroBreakdown);
  });

  describe('GET /api/dashboard', () => {
    const mockUser = {
      id: 'user-123',
      email: 'admin@alterna.dev',
      name: 'Admin User',
      hasAccess: true,
      isAdmin: true,
    };

    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValueOnce(null);

      const request = new NextRequest('http://localhost/api/dashboard');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 when user has no access', async () => {
      mockAuth.mockResolvedValueOnce({
        user: { ...mockUser, hasAccess: false },
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      const request = new NextRequest('http://localhost/api/dashboard');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden - App access required');
    });

    it('should return dashboard metrics when authenticated', async () => {
      mockAuth.mockResolvedValueOnce({
        user: mockUser,
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      // Mock application counts (totalActiveApplications, applicationsThisWeek)
      (mockDb.application.count as jest.Mock)
        .mockResolvedValueOnce(15)  // totalActiveApplications
        .mockResolvedValueOnce(5);  // applicationsThisWeek

      // Mock attention breakdown via shared service function
      mockGetAttentionBreakdown.mockResolvedValueOnce({
        awaitingGC: 3,
        gcFailedPendingRejection: 0,
        awaitingSC: 1,
        pendingInterviews: 2,
        pendingAgreement: 2,
        total: 8,
      });

      // Mock person count
      (mockDb.person.count as jest.Mock).mockResolvedValueOnce(12);

      // Mock applications by stage
      (mockDb.application.groupBy as jest.Mock)
        .mockResolvedValueOnce([
          { currentStage: Stage.APPLICATION, _count: 5 },
          { currentStage: Stage.GENERAL_COMPETENCIES, _count: 3 },
          { currentStage: Stage.INTERVIEW, _count: 2 },
        ])
        .mockResolvedValueOnce([
          { status: Status.ACTIVE, _count: 15 },
          { status: Status.ACCEPTED, _count: 5 },
          { status: Status.REJECTED, _count: 3 },
        ])
        .mockResolvedValueOnce([
          { position: 'Software Developer', _count: 8 },
          { position: 'Designer', _count: 4 },
        ]);

      // Mock recent activity
      mockGetRecentAuditLogs.mockResolvedValueOnce([
        {
          id: 'log-1',
          action: 'Application created',
          actionType: ActionType.CREATE,
          createdAt: new Date(),
          userId: 'user-123',
          personId: 'person-1',
          applicationId: 'app-1',
          details: null,
          ipAddress: null,
          userAgent: null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          user: { id: 'user-123', displayName: 'Admin User' } as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          person: { id: 'person-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' } as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          application: { id: 'app-1', position: 'Developer' } as any,
        },
      ]);

      const request = new NextRequest('http://localhost/api/dashboard');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metrics.totalActiveApplications).toBe(15);
      expect(data.metrics.totalPersons).toBe(12);
      expect(data.metrics.pendingInterviews).toBe(2);
      expect(data.metrics.awaitingAction).toBe(8); // awaitingGC(3) + awaitingSC(1) + pendingInterviews(2) + pendingAgreement(2)
      expect(data.metrics.breakdown.awaitingGC).toBe(3);
      expect(data.metrics.breakdown.pendingAgreement).toBe(2);
      expect(data.byStage).toBeDefined();
      expect(data.byStatus).toBeDefined();
      expect(data.recentActivity).toHaveLength(1);
      expect(data.generatedAt).toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      mockAuth.mockResolvedValueOnce({
        user: mockUser,
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      (mockDb.application.count as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      const request = new NextRequest('http://localhost/api/dashboard');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should return zero counts when no data exists', async () => {
      mockAuth.mockResolvedValueOnce({
        user: mockUser,
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      // Mock all counts as zero
      (mockDb.application.count as jest.Mock).mockResolvedValue(0);
      (mockDb.person.count as jest.Mock).mockResolvedValueOnce(0);
      (mockDb.application.groupBy as jest.Mock).mockResolvedValue([]);
      mockGetRecentAuditLogs.mockResolvedValueOnce([]);

      const request = new NextRequest('http://localhost/api/dashboard');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metrics.totalActiveApplications).toBe(0);
      expect(data.metrics.totalPersons).toBe(0);
      expect(data.byStage.APPLICATION).toBe(0);
      expect(data.byStage.SIGNED).toBe(0);
      expect(data.byStatus.ACTIVE).toBe(0);
      expect(data.recentActivity).toEqual([]);
    });

    it('should format stage data with all stages present', async () => {
      mockAuth.mockResolvedValueOnce({
        user: mockUser,
        expires: new Date(Date.now() + 86400000).toISOString(),
      });

      (mockDb.application.count as jest.Mock).mockResolvedValue(0);
      (mockDb.person.count as jest.Mock).mockResolvedValueOnce(0);
      (mockDb.application.groupBy as jest.Mock)
        .mockResolvedValueOnce([
          { currentStage: Stage.INTERVIEW, _count: 3 },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockGetRecentAuditLogs.mockResolvedValueOnce([]);

      const request = new NextRequest('http://localhost/api/dashboard');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // All stages should be present even if 0
      expect(data.byStage).toHaveProperty('APPLICATION');
      expect(data.byStage).toHaveProperty('GENERAL_COMPETENCIES');
      expect(data.byStage).toHaveProperty('SPECIALIZED_COMPETENCIES');
      expect(data.byStage).toHaveProperty('INTERVIEW');
      expect(data.byStage).toHaveProperty('AGREEMENT');
      expect(data.byStage).toHaveProperty('SIGNED');
      expect(data.byStage.INTERVIEW).toBe(3);
    });
  });
});
