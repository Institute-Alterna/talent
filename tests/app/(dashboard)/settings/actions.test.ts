/**
 * Settings Actions Tests
 *
 * Tests for the settings page server actions.
 */

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock database
jest.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

// Mock user service
jest.mock('@/lib/services/users', () => ({
  getUserById: jest.fn(),
  updateProfile: jest.fn(),
}));

// Mock next/cache
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getUserById, updateProfile } from '@/lib/services/users';
import {
  fetchUserSettings,
  updateSchedulingLinkAction,
  fetchUserActivityHistory,
} from '@/app/(dashboard)/settings/actions';

const mockUser = {
  id: 'user-123',
  oktaUserId: 'okta-123',
  email: 'test@alterna.dev',
  firstName: 'Test',
  lastName: 'User',
  displayName: 'Test User',
  title: 'Developer',
  isAdmin: false,
  hasAppAccess: true,
  schedulingLink: 'https://calendly.com/test',
  timezone: 'America/New_York',
  preferredLanguage: 'en',
  createdAt: new Date('2024-01-01'),
  lastSyncedAt: new Date('2024-01-15'),
};

const mockSession = {
  user: {
    id: 'okta-123',
    email: 'test@alterna.dev',
    name: 'Test User',
    isAdmin: false,
    dbUserId: 'user-123',
  },
};

describe('Settings Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchUserSettings', () => {
    it('returns user settings when authenticated', async () => {
      (auth as jest.Mock).mockResolvedValue(mockSession);
      (getUserById as jest.Mock).mockResolvedValue(mockUser);

      const result = await fetchUserSettings();

      expect(result.success).toBe(true);
      expect(result.data?.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        displayName: mockUser.displayName,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
        title: mockUser.title,
        isAdmin: mockUser.isAdmin,
        schedulingLink: mockUser.schedulingLink,
        timezone: mockUser.timezone,
        preferredLanguage: mockUser.preferredLanguage,
        createdAt: mockUser.createdAt,
        lastSyncedAt: mockUser.lastSyncedAt,
      });
    });

    it('returns error when not authenticated', async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const result = await fetchUserSettings();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('returns error when session has no dbUserId', async () => {
      (auth as jest.Mock).mockResolvedValue({
        user: { id: 'okta-123', email: 'test@example.com' },
      });

      const result = await fetchUserSettings();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('returns error when user not found', async () => {
      (auth as jest.Mock).mockResolvedValue(mockSession);
      (getUserById as jest.Mock).mockResolvedValue(null);

      const result = await fetchUserSettings();

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('updateSchedulingLinkAction', () => {
    it('updates scheduling link with valid URL', async () => {
      (auth as jest.Mock).mockResolvedValue(mockSession);
      (updateProfile as jest.Mock).mockResolvedValue({
        ...mockUser,
        schedulingLink: 'https://cal.com/newlink',
      });

      const result = await updateSchedulingLinkAction('https://cal.com/newlink');

      expect(result.success).toBe(true);
      expect(result.data?.schedulingLink).toBe('https://cal.com/newlink');
      expect(updateProfile).toHaveBeenCalledWith('user-123', {
        schedulingLink: 'https://cal.com/newlink',
      });
    });

    it('clears scheduling link with null', async () => {
      (auth as jest.Mock).mockResolvedValue(mockSession);
      (updateProfile as jest.Mock).mockResolvedValue({
        ...mockUser,
        schedulingLink: null,
      });

      const result = await updateSchedulingLinkAction(null);

      expect(result.success).toBe(true);
      expect(result.data?.schedulingLink).toBe(null);
      expect(updateProfile).toHaveBeenCalledWith('user-123', {
        schedulingLink: null,
      });
    });

    it('clears scheduling link with empty string', async () => {
      (auth as jest.Mock).mockResolvedValue(mockSession);
      (updateProfile as jest.Mock).mockResolvedValue({
        ...mockUser,
        schedulingLink: null,
      });

      const result = await updateSchedulingLinkAction('');

      expect(result.success).toBe(true);
      expect(updateProfile).toHaveBeenCalledWith('user-123', {
        schedulingLink: null,
      });
    });

    it('returns error for invalid URL', async () => {
      (auth as jest.Mock).mockResolvedValue(mockSession);

      const result = await updateSchedulingLinkAction('not-a-valid-url');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Please enter a valid URL');
      expect(updateProfile).not.toHaveBeenCalled();
    });

    it('returns error when not authenticated', async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const result = await updateSchedulingLinkAction('https://cal.com/test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('trims whitespace from URL', async () => {
      (auth as jest.Mock).mockResolvedValue(mockSession);
      (updateProfile as jest.Mock).mockResolvedValue({
        ...mockUser,
        schedulingLink: 'https://cal.com/test',
      });

      await updateSchedulingLinkAction('  https://cal.com/test  ');

      expect(updateProfile).toHaveBeenCalledWith('user-123', {
        schedulingLink: 'https://cal.com/test',
      });
    });
  });

  describe('fetchUserActivityHistory', () => {
    const mockActivities = [
      {
        id: 'activity-1',
        action: 'Viewed candidate profile',
        actionType: 'VIEW',
        details: null,
        createdAt: new Date('2024-01-15T10:30:00Z'),
        candidate: {
          id: 'candidate-1',
          firstName: 'John',
          lastName: 'Doe',
        },
      },
      {
        id: 'activity-2',
        action: 'Updated candidate status',
        actionType: 'UPDATE',
        details: { oldStatus: 'ACTIVE', newStatus: 'INTERVIEW' },
        createdAt: new Date('2024-01-14T09:00:00Z'),
        candidate: null,
      },
    ];

    it('returns activity history when authenticated', async () => {
      (auth as jest.Mock).mockResolvedValue(mockSession);
      (db.auditLog.findMany as jest.Mock).mockResolvedValue(mockActivities);
      (db.auditLog.count as jest.Mock).mockResolvedValue(10);

      const result = await fetchUserActivityHistory();

      expect(result.success).toBe(true);
      expect(result.data?.activities).toHaveLength(2);
      expect(result.data?.total).toBe(10);
      expect(db.auditLog.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
      });
    });

    it('respects limit and offset options', async () => {
      (auth as jest.Mock).mockResolvedValue(mockSession);
      (db.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (db.auditLog.count as jest.Mock).mockResolvedValue(0);

      await fetchUserActivityHistory({ limit: 5, offset: 10 });

      expect(db.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
          skip: 10,
        })
      );
    });

    it('returns error when not authenticated', async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const result = await fetchUserActivityHistory();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Not authenticated');
    });

    it('returns empty array when no activities found', async () => {
      (auth as jest.Mock).mockResolvedValue(mockSession);
      (db.auditLog.findMany as jest.Mock).mockResolvedValue([]);
      (db.auditLog.count as jest.Mock).mockResolvedValue(0);

      const result = await fetchUserActivityHistory();

      expect(result.success).toBe(true);
      expect(result.data?.activities).toEqual([]);
      expect(result.data?.total).toBe(0);
    });
  });
});
