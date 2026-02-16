/**
 * Individual User API Route Tests
 *
 * Tests for the /api/users/[id] endpoint.
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
  getUserById: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
}));

import { GET, PUT, DELETE } from '@/app/api/users/[id]/route';
import { auth } from '@/lib/auth';
import { getUserById, updateUser, deleteUser } from '@/lib/services/users';

const mockAuthAdmin = {
  user: {
    id: 'user-1',
    email: 'admin@alterna.dev',
    name: 'Admin User',
    isAdmin: true,
    dbUserId: 'admin-db-id',
  },
};

const mockAuthNonAdmin = {
  user: {
    id: 'user-2',
    email: 'user@alterna.dev',
    name: 'Regular User',
    isAdmin: false,
    dbUserId: 'user-db-id',
  },
};

const mockUser = {
  id: 'target-user-id',
  oktaUserId: 'okta-123',
  email: 'target@alterna.dev',
  displayName: 'Target User',
  firstName: 'Target',
  lastName: 'User',
  isAdmin: false,
  schedulingLink: null,
};

describe('/api/users/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getUserById as jest.Mock).mockResolvedValue(mockUser);
  });

  describe('GET', () => {
    it('returns 401 when not authenticated', async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/users/target-user-id');
      const response = await GET(request, { params: Promise.resolve({ id: 'target-user-id' }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 403 for non-admin viewing other user', async () => {
      (auth as jest.Mock).mockResolvedValue(mockAuthNonAdmin);

      const request = new NextRequest('http://localhost:3000/api/users/target-user-id');
      const response = await GET(request, { params: Promise.resolve({ id: 'target-user-id' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('allows non-admin to view own profile', async () => {
      (auth as jest.Mock).mockResolvedValue(mockAuthNonAdmin);
      (getUserById as jest.Mock).mockResolvedValue({
        ...mockUser,
        id: 'user-db-id',
      });

      const request = new NextRequest('http://localhost:3000/api/users/user-db-id');
      const response = await GET(request, { params: Promise.resolve({ id: 'user-db-id' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toBeDefined();
    });

    it('returns user for admin', async () => {
      (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

      const request = new NextRequest('http://localhost:3000/api/users/target-user-id');
      const response = await GET(request, { params: Promise.resolve({ id: 'target-user-id' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user).toEqual(mockUser);
    });

    it('returns 404 when user not found', async () => {
      (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);
      (getUserById as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/users/nonexistent');
      const response = await GET(request, { params: Promise.resolve({ id: 'nonexistent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });
  });

  describe('PUT', () => {
    it('returns 401 when not authenticated', async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/users/target-user-id', {
        method: 'PUT',
        body: JSON.stringify({ title: 'New Title' }),
      });
      const response = await PUT(request, { params: Promise.resolve({ id: 'target-user-id' }) });

      expect(response.status).toBe(401);
    });

    it('allows non-admin to update own scheduling link only', async () => {
      (auth as jest.Mock).mockResolvedValue(mockAuthNonAdmin);
      (updateUser as jest.Mock).mockResolvedValue({
        ...mockUser,
        id: 'user-db-id',
        schedulingLink: 'https://cal.com/user',
      });

      const request = new NextRequest('http://localhost:3000/api/users/user-db-id', {
        method: 'PUT',
        body: JSON.stringify({ schedulingLink: 'https://cal.com/user' }),
      });
      const response = await PUT(request, { params: Promise.resolve({ id: 'user-db-id' }) });
      await response.json();

      expect(response.status).toBe(200);
      expect(updateUser).toHaveBeenCalledWith('user-db-id', { schedulingLink: 'https://cal.com/user' });
    });

    it('rejects non-admin updating other fields', async () => {
      (auth as jest.Mock).mockResolvedValue(mockAuthNonAdmin);

      const request = new NextRequest('http://localhost:3000/api/users/user-db-id', {
        method: 'PUT',
        body: JSON.stringify({ title: 'New Title' }),
      });
      const response = await PUT(request, { params: Promise.resolve({ id: 'user-db-id' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('You can only update your scheduling link');
    });

    it('allows admin to update any field', async () => {
      (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);
      (updateUser as jest.Mock).mockResolvedValue({
        ...mockUser,
        title: 'New Title',
        isAdmin: true,
      });

      const request = new NextRequest('http://localhost:3000/api/users/target-user-id', {
        method: 'PUT',
        body: JSON.stringify({ title: 'New Title', isAdmin: true }),
      });
      const response = await PUT(request, { params: Promise.resolve({ id: 'target-user-id' }) });

      expect(response.status).toBe(200);
      expect(updateUser).toHaveBeenCalledWith('target-user-id', expect.objectContaining({
        title: 'New Title',
        isAdmin: true,
      }));
    });

    it('validates operationalClearance', async () => {
      (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

      const request = new NextRequest('http://localhost:3000/api/users/target-user-id', {
        method: 'PUT',
        body: JSON.stringify({ operationalClearance: 'INVALID' }),
      });
      const response = await PUT(request, { params: Promise.resolve({ id: 'target-user-id' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid operational clearance value');
    });

    it('validates isAdmin is boolean', async () => {
      (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

      const request = new NextRequest('http://localhost:3000/api/users/target-user-id', {
        method: 'PUT',
        body: JSON.stringify({ isAdmin: 'yes' }),
      });
      const response = await PUT(request, { params: Promise.resolve({ id: 'target-user-id' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('isAdmin must be a boolean');
    });
  });

  describe('DELETE', () => {
    it('returns 401 when not authenticated', async () => {
      (auth as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/users/target-user-id', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'target-user-id' }) });

      expect(response.status).toBe(401);
    });

    it('returns 403 for non-admin', async () => {
      (auth as jest.Mock).mockResolvedValue(mockAuthNonAdmin);

      const request = new NextRequest('http://localhost:3000/api/users/target-user-id', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'target-user-id' }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden - Admin access required');
    });

    it('prevents admin from deleting themselves', async () => {
      (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

      const request = new NextRequest('http://localhost:3000/api/users/admin-db-id', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'admin-db-id' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Cannot delete your own account');
    });

    it('allows admin to delete other users', async () => {
      (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);
      (deleteUser as jest.Mock).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/users/target-user-id', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'target-user-id' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(deleteUser).toHaveBeenCalledWith('target-user-id');
    });

    it('returns 404 when user not found', async () => {
      (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);
      (getUserById as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/users/nonexistent', {
        method: 'DELETE',
      });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'nonexistent' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('User not found');
    });
  });
});
