/**
 * User Service Tests
 *
 * Tests for the user service layer functions.
 */

import { db } from '@/lib/db';
import {
  getUsers,
  getUserById,
  getUserByOktaId,
  getUserByEmail,
  createUser,
  updateUser,
  deleteUser,
  getUserStats,
  getInterviewers,
  syncUsersFromOkta,
} from '@/lib/services/users';

// Mock the database
jest.mock('@/lib/db', () => ({
  db: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

const mockUser = {
  id: 'user-123',
  oktaUserId: 'okta-123',
  email: 'test@alterna.dev',
  secondaryEmail: null,
  firstName: 'Test',
  middleName: null,
  lastName: 'User',
  displayName: 'Test User',
  title: 'Developer',
  city: null,
  state: null,
  countryCode: null,
  preferredLanguage: 'en',
  timezone: 'America/New_York',
  organisation: 'Institute Alterna',
  operationalClearance: 'A',
  isAdmin: false,
  schedulingLink: null,
  oktaStatus: 'ACTIVE',
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSyncedAt: new Date(),
};

describe('User Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('returns all non-dismissed users when no options provided', async () => {
      const mockUsers = [mockUser];
      (db.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const result = await getUsers();

      expect(db.user.findMany).toHaveBeenCalledWith({
        where: { oktaStatus: { not: 'DEPROVISIONED' } },
        select: expect.any(Object),
        orderBy: { displayName: 'asc' },
        take: 100,
        skip: 0,
      });
      expect(result).toEqual(mockUsers);
    });

    it('filters by admin status', async () => {
      (db.user.findMany as jest.Mock).mockResolvedValue([]);

      await getUsers({ isAdmin: true });

      expect(db.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isAdmin: true }),
        })
      );
    });

    it('filters by search query', async () => {
      (db.user.findMany as jest.Mock).mockResolvedValue([]);

      await getUsers({ search: 'test' });

      expect(db.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { email: { contains: 'test' } },
              { displayName: { contains: 'test' } },
              { firstName: { contains: 'test' } },
              { lastName: { contains: 'test' } },
            ],
          }),
        })
      );
    });

    it('respects limit and offset', async () => {
      (db.user.findMany as jest.Mock).mockResolvedValue([]);

      await getUsers({ limit: 10, offset: 20 });

      expect(db.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
    });

    it('filters by oktaStatus', async () => {
      (db.user.findMany as jest.Mock).mockResolvedValue([]);

      await getUsers({ oktaStatus: 'ACTIVE' });

      expect(db.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { oktaStatus: 'ACTIVE' },
        })
      );
    });

    it('excludes deprovisioned users when oktaStatus is ALL', async () => {
      (db.user.findMany as jest.Mock).mockResolvedValue([]);

      await getUsers({ oktaStatus: 'ALL' });

      expect(db.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { oktaStatus: { not: 'DEPROVISIONED' } },
        })
      );
    });

    it('shows only deprovisioned users when oktaStatus is DISMISSED', async () => {
      (db.user.findMany as jest.Mock).mockResolvedValue([]);

      await getUsers({ oktaStatus: 'DISMISSED' });

      expect(db.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { oktaStatus: 'DEPROVISIONED' },
        })
      );
    });
  });

  describe('getUserById', () => {
    it('returns user when found', async () => {
      (db.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await getUserById('user-123');

      expect(db.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
      expect(result).toEqual(mockUser);
    });

    it('returns null when not found', async () => {
      (db.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getUserById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getUserByOktaId', () => {
    it('returns user when found', async () => {
      (db.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await getUserByOktaId('okta-123');

      expect(db.user.findUnique).toHaveBeenCalledWith({
        where: { oktaUserId: 'okta-123' },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('getUserByEmail', () => {
    it('returns user when found', async () => {
      (db.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await getUserByEmail('test@alterna.dev');

      expect(db.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@alterna.dev' },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('createUser', () => {
    it('creates a new user with required fields', async () => {
      (db.user.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await createUser({
        oktaUserId: 'okta-123',
        email: 'test@alterna.dev',
        firstName: 'Test',
        lastName: 'User',
        displayName: 'Test User',
      });

      expect(db.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          oktaUserId: 'okta-123',
          email: 'test@alterna.dev',
          firstName: 'Test',
          lastName: 'User',
          displayName: 'Test User',
          preferredLanguage: 'en',
          timezone: 'America/New_York',
          organisation: 'Institute Alterna',
          operationalClearance: 'A',
          isAdmin: false,
        }),
      });
      expect(result).toEqual(mockUser);
    });

    it('creates an admin user when specified', async () => {
      (db.user.create as jest.Mock).mockResolvedValue({ ...mockUser, isAdmin: true });

      await createUser({
        oktaUserId: 'okta-admin',
        email: 'admin@alterna.dev',
        firstName: 'Admin',
        lastName: 'User',
        displayName: 'Admin User',
        isAdmin: true,
      });

      expect(db.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isAdmin: true,
        }),
      });
    });
  });

  describe('updateUser', () => {
    it('updates user with provided data', async () => {
      (db.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        title: 'Senior Developer',
      });

      const result = await updateUser('user-123', { title: 'Senior Developer' });

      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: expect.objectContaining({
          title: 'Senior Developer',
        }),
      });
      expect(result.title).toBe('Senior Developer');
    });
  });

  describe('deleteUser', () => {
    it('deletes user by id', async () => {
      (db.user.delete as jest.Mock).mockResolvedValue(mockUser);

      await deleteUser('user-123');

      expect(db.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
    });
  });

  describe('getUserStats', () => {
    it('returns user statistics including active/inactive/dismissed counts and lastSyncedAt', async () => {
      const lastSyncDate = new Date('2024-01-15T10:30:00Z');
      
      (db.user.count as jest.Mock)
        .mockResolvedValueOnce(12) // totalAll (includes dismissed)
        .mockResolvedValueOnce(8)  // active
        .mockResolvedValueOnce(2)  // dismissed (deprovisioned)
        .mockResolvedValueOnce(3)  // admins
        .mockResolvedValueOnce(7); // with scheduling link
      
      (db.user.findFirst as jest.Mock).mockResolvedValueOnce({ lastSyncedAt: lastSyncDate });

      const result = await getUserStats();

      expect(result).toEqual({
        total: 10, // totalAll - dismissed = 12 - 2
        active: 8,
        inactive: 2, // total - active = 10 - 8
        dismissed: 2,
        admins: 3,
        hiringManagers: 7, // total - admins = 10 - 3
        withSchedulingLink: 7,
        lastSyncedAt: lastSyncDate,
      });
    });
  });

  describe('getInterviewers', () => {
    it('returns active users with scheduling links and app access', async () => {
      const mockInterviewers = [{ ...mockUser, schedulingLink: 'https://cal.com/test', hasAppAccess: true }];
      (db.user.findMany as jest.Mock).mockResolvedValue(mockInterviewers);

      const result = await getInterviewers();

      expect(db.user.findMany).toHaveBeenCalledWith({
        where: {
          schedulingLink: { not: null },
          oktaStatus: 'ACTIVE',
          hasAppAccess: true,
        },
        select: expect.any(Object),
        orderBy: { displayName: 'asc' },
      });
      expect(result).toEqual(mockInterviewers);
    });
  });

  describe('syncUsersFromOkta', () => {
    it('upserts users from Okta', async () => {
      (db.user.upsert as jest.Mock).mockResolvedValue(mockUser);
      (db.user.findMany as jest.Mock).mockResolvedValue([]);

      const oktaUsers = [
        {
          oktaUserId: 'okta-123',
          email: 'test@alterna.dev',
          firstName: 'Test',
          lastName: 'User',
        },
        {
          oktaUserId: 'okta-456',
          email: 'test2@alterna.dev',
          firstName: 'Test2',
          lastName: 'User2',
        },
      ];

      const result = await syncUsersFromOkta(oktaUsers);

      expect(db.user.upsert).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ synced: 2, removed: 0 });
    });
  });
});
