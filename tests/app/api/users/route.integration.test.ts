/**
 * Users API Route Tests
 *
 * Tests for the /api/users endpoint.
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock user service
jest.mock('@/lib/services/users', () => ({
  getUsers: jest.fn(),
  getUserStats: jest.fn(),
}));

import { GET } from '@/app/api/users/route';
import { auth } from '@/lib/auth';
import { getUsers, getUserStats } from '@/lib/services/users';

const mockAuthAdmin = {
  user: {
    id: 'user-1',
    email: 'admin@alterna.dev',
    name: 'Admin User',
    isAdmin: true,
    dbUserId: 'db-user-1',
  },
};

const mockAuthNonAdmin = {
  user: {
    id: 'user-2',
    email: 'user@alterna.dev',
    name: 'Regular User',
    isAdmin: false,
    dbUserId: 'db-user-2',
  },
};

const mockUsers = [
  {
    id: 'user-1',
    email: 'admin@alterna.dev',
    displayName: 'Admin User',
    title: 'Admin',
    isAdmin: true,
    schedulingLink: null,
    lastSyncedAt: new Date(),
    createdAt: new Date(),
  },
];

const mockStats = {
  total: 5,
  admins: 2,
  hiringManagers: 3,
  withSchedulingLink: 4,
};

describe('GET /api/users', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getUsers as jest.Mock).mockResolvedValue(mockUsers);
    (getUserStats as jest.Mock).mockResolvedValue(mockStats);
  });

  it('returns 401 when not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/users');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 for non-admin users', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthNonAdmin);

    const request = new NextRequest('http://localhost:3000/api/users');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden - Admin access required');
  });

  it('returns users and stats for admin users', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = new NextRequest('http://localhost:3000/api/users');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.users).toEqual(mockUsers);
    expect(data.stats).toEqual(mockStats);
    expect(data.pagination).toBeDefined();
  });

  it('passes search parameter to getUsers', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = new NextRequest('http://localhost:3000/api/users?search=admin');
    await GET(request);

    expect(getUsers).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'admin',
      })
    );
  });

  it('passes isAdmin filter to getUsers', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = new NextRequest('http://localhost:3000/api/users?isAdmin=true');
    await GET(request);

    expect(getUsers).toHaveBeenCalledWith(
      expect.objectContaining({
        isAdmin: true,
      })
    );
  });

  it('passes pagination parameters', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = new NextRequest('http://localhost:3000/api/users?limit=10&offset=20');
    await GET(request);

    expect(getUsers).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 10,
        offset: 20,
      })
    );
  });

  it('returns 500 on error', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);
    (getUsers as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/users');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
