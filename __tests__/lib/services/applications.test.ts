/**
 * Application Service Tests
 *
 * Unit tests for the Application service layer.
 * Tests use mocked Prisma client to avoid database dependencies.
 */

import { db } from '@/lib/db';
import {
  getApplications,
  getApplicationById,
  getApplicationByTallySubmissionId,
  createApplication,
  updateApplication,
  advanceApplicationStage,
  updateApplicationStatus,
  deleteApplication,
  getApplicationStats,
  getApplicationsByPersonId,
  getApplicationsAwaitingGCResult,
  advanceMultipleApplications,
  rejectMultipleApplications,
  getAvailablePositions,
  canAdvanceToStage,
  getNextStage,
} from '@/lib/services/applications';
import type { Application } from '@/types/application';

// Mock the database
jest.mock('@/lib/db', () => ({
  db: {
    application: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  },
}));

const mockApplication = {
  id: 'app-123',
  personId: 'person-123',
  position: 'Software Developer',
  currentStage: 'APPLICATION' as const,
  status: 'ACTIVE' as const,
  resumeUrl: 'https://example.com/resume.pdf',
  academicBackground: 'Computer Science from UC Berkeley',
  previousExperience: '3 years frontend development',
  videoLink: 'https://youtube.com/watch?v=123',
  otherFileUrl: null,
  hasResume: true,
  hasAcademicBg: true,
  hasVideoIntro: true,
  hasPreviousExp: true,
  hasOtherFile: false,
  tallySubmissionId: 'tally-sub-123',
  tallyResponseId: 'tally-res-123',
  tallyFormId: 'tally-form-123',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Application Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getApplications', () => {
    it('returns paginated list of applications with person info', async () => {
      const mockApplications = [
        {
          ...mockApplication,
          person: {
            id: 'person-123',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            generalCompetenciesCompleted: false,
            generalCompetenciesScore: null,
          },
          _count: { interviews: 0, decisions: 0 },
        },
      ];

      (db.application.findMany as jest.Mock).mockResolvedValue(mockApplications);
      (db.application.count as jest.Mock).mockResolvedValue(1);

      const result = await getApplications({ page: 1, limit: 20 });

      expect(result.applications).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('filters by stage', async () => {
      (db.application.findMany as jest.Mock).mockResolvedValue([]);
      (db.application.count as jest.Mock).mockResolvedValue(0);

      await getApplications({ stage: 'INTERVIEW' });

      expect(db.application.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            currentStage: 'INTERVIEW',
          }),
        })
      );
    });

    it('filters by status', async () => {
      (db.application.findMany as jest.Mock).mockResolvedValue([]);
      (db.application.count as jest.Mock).mockResolvedValue(0);

      await getApplications({ status: 'ACTIVE' });

      expect(db.application.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
          }),
        })
      );
    });

    it('filters by position', async () => {
      (db.application.findMany as jest.Mock).mockResolvedValue([]);
      (db.application.count as jest.Mock).mockResolvedValue(0);

      await getApplications({ position: 'Software Developer' });

      expect(db.application.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            position: 'Software Developer',
          }),
        })
      );
    });

    it('supports search across person fields', async () => {
      (db.application.findMany as jest.Mock).mockResolvedValue([]);
      (db.application.count as jest.Mock).mockResolvedValue(0);

      await getApplications({ search: 'john' });

      expect(db.application.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { position: { contains: 'john' } },
              { person: { email: { contains: 'john' } } },
            ]),
          }),
        })
      );
    });
  });

  describe('getApplicationById', () => {
    it('returns application when found', async () => {
      (db.application.findUnique as jest.Mock).mockResolvedValue(mockApplication);

      const result = await getApplicationById('app-123');

      expect(result).toEqual(mockApplication);
      expect(db.application.findUnique).toHaveBeenCalledWith({
        where: { id: 'app-123' },
      });
    });

    it('returns null when not found', async () => {
      (db.application.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getApplicationById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getApplicationByTallySubmissionId', () => {
    it('returns application by Tally submission ID', async () => {
      (db.application.findUnique as jest.Mock).mockResolvedValue(mockApplication);

      const result = await getApplicationByTallySubmissionId('tally-sub-123');

      expect(result).toEqual(mockApplication);
      expect(db.application.findUnique).toHaveBeenCalledWith({
        where: { tallySubmissionId: 'tally-sub-123' },
      });
    });
  });

  describe('createApplication', () => {
    it('creates application with all fields', async () => {
      (db.application.create as jest.Mock).mockResolvedValue(mockApplication);

      const result = await createApplication({
        personId: 'person-123',
        position: 'Software Developer',
        tallySubmissionId: 'tally-sub-123',
        resumeUrl: 'https://example.com/resume.pdf',
        hasResume: true,
      });

      expect(result).toEqual(mockApplication);
      expect(db.application.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          personId: 'person-123',
          position: 'Software Developer',
          tallySubmissionId: 'tally-sub-123',
          resumeUrl: 'https://example.com/resume.pdf',
          hasResume: true,
        }),
      });
    });
  });

  describe('updateApplication', () => {
    it('updates application fields', async () => {
      const updatedApp = { ...mockApplication, currentStage: 'INTERVIEW' as const };

      (db.application.update as jest.Mock).mockResolvedValue(updatedApp);

      const result = await updateApplication('app-123', { currentStage: 'INTERVIEW' });

      expect(result).toEqual(updatedApp);
      expect(db.application.update).toHaveBeenCalledWith({
        where: { id: 'app-123' },
        data: expect.objectContaining({
          currentStage: 'INTERVIEW',
          updatedAt: expect.any(Date),
        }),
      });
    });
  });

  describe('advanceApplicationStage', () => {
    it('advances application to new stage', async () => {
      const updatedApp = { ...mockApplication, currentStage: 'INTERVIEW' as const };

      (db.application.update as jest.Mock).mockResolvedValue(updatedApp);

      const result = await advanceApplicationStage('app-123', 'INTERVIEW');

      expect(result.currentStage).toBe('INTERVIEW');
      expect(db.application.update).toHaveBeenCalledWith({
        where: { id: 'app-123' },
        data: expect.objectContaining({
          currentStage: 'INTERVIEW',
        }),
      });
    });
  });

  describe('updateApplicationStatus', () => {
    it('updates application status', async () => {
      const updatedApp = { ...mockApplication, status: 'REJECTED' as const };

      (db.application.update as jest.Mock).mockResolvedValue(updatedApp);

      const result = await updateApplicationStatus('app-123', 'REJECTED');

      expect(result.status).toBe('REJECTED');
    });
  });

  describe('deleteApplication', () => {
    it('deletes application by ID', async () => {
      (db.application.delete as jest.Mock).mockResolvedValue({ id: 'app-123' });

      await deleteApplication('app-123');

      expect(db.application.delete).toHaveBeenCalledWith({
        where: { id: 'app-123' },
      });
    });
  });

  describe('getApplicationsByPersonId', () => {
    it('returns all applications for a person', async () => {
      const mockApplications = [
        { id: '1', position: 'Software Developer' },
        { id: '2', position: 'Content Writer' },
      ];

      (db.application.findMany as jest.Mock).mockResolvedValue(mockApplications);

      const result = await getApplicationsByPersonId('person-123');

      expect(result).toHaveLength(2);
      expect(db.application.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { personId: 'person-123' },
        })
      );
    });
  });

  describe('getApplicationsAwaitingGCResult', () => {
    it('returns applications in APPLICATION or GENERAL_COMPETENCIES stage', async () => {
      const mockApplications = [
        { id: '1', currentStage: 'APPLICATION' },
        { id: '2', currentStage: 'GENERAL_COMPETENCIES' },
      ];

      (db.application.findMany as jest.Mock).mockResolvedValue(mockApplications);

      const result = await getApplicationsAwaitingGCResult('person-123');

      expect(result).toHaveLength(2);
      expect(db.application.findMany).toHaveBeenCalledWith({
        where: {
          personId: 'person-123',
          status: 'ACTIVE',
          currentStage: { in: ['APPLICATION', 'GENERAL_COMPETENCIES'] },
        },
      });
    });
  });

  describe('advanceMultipleApplications', () => {
    it('advances multiple applications at once', async () => {
      (db.application.updateMany as jest.Mock).mockResolvedValue({ count: 3 });

      await advanceMultipleApplications(['1', '2', '3'], 'SPECIALIZED_COMPETENCIES');

      expect(db.application.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['1', '2', '3'] } },
        data: expect.objectContaining({
          currentStage: 'SPECIALIZED_COMPETENCIES',
        }),
      });
    });
  });

  describe('rejectMultipleApplications', () => {
    it('rejects multiple applications at once', async () => {
      (db.application.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

      await rejectMultipleApplications(['1', '2']);

      expect(db.application.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['1', '2'] } },
        data: expect.objectContaining({
          status: 'REJECTED',
        }),
      });
    });
  });

  describe('getAvailablePositions', () => {
    it('returns array of positions from config', () => {
      const positions = getAvailablePositions();

      expect(Array.isArray(positions)).toBe(true);
      expect(positions.length).toBeGreaterThan(0);
      expect(positions).toContain('Software Developer');
    });
  });

  describe('canAdvanceToStage', () => {
    it('returns true for valid advancement', () => {
      const application = {
        ...mockApplication,
        currentStage: 'APPLICATION' as const,
        status: 'ACTIVE' as const,
      } as Application;

      const result = canAdvanceToStage(application, 'GENERAL_COMPETENCIES');

      expect(result).toBe(true);
    });

    it('returns false for backward movement', () => {
      const application = {
        ...mockApplication,
        currentStage: 'INTERVIEW' as const,
        status: 'ACTIVE' as const,
      } as Application;

      const result = canAdvanceToStage(application, 'APPLICATION');

      expect(result).toBe(false);
    });

    it('returns false for rejected applications', () => {
      const application = {
        ...mockApplication,
        currentStage: 'APPLICATION' as const,
        status: 'REJECTED' as const,
      } as Application;

      const result = canAdvanceToStage(application, 'INTERVIEW');

      expect(result).toBe(false);
    });
  });

  describe('getNextStage', () => {
    it('returns next stage for APPLICATION', () => {
      const next = getNextStage('APPLICATION');
      expect(next).toBe('GENERAL_COMPETENCIES');
    });

    it('returns next stage for INTERVIEW', () => {
      const next = getNextStage('INTERVIEW');
      expect(next).toBe('AGREEMENT');
    });

    it('returns null for final stage', () => {
      const next = getNextStage('SIGNED');
      expect(next).toBeNull();
    });
  });
});
