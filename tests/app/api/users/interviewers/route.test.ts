/**
 * Interviewers API Route Tests
 *
 * Tests for GET /api/users/interviewers — available to hiring managers and admins.
 */

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/services/users', () => ({
  getInterviewers: jest.fn(),
}));

import { GET } from '@/app/api/users/interviewers/route';
import { auth } from '@/lib/auth';
import { getInterviewers } from '@/lib/services/users';

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
    email: 'hm@alterna.dev',
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
    name: 'No Access',
    isAdmin: false,
    hasAccess: false,
    dbUserId: 'db-user-3',
  },
};

const mockInterviewers = [
  {
    id: 'user-1',
    email: 'admin@alterna.dev',
    displayName: 'Admin User',
    schedulingLink: 'https://cal.com/admin',
  },
  {
    id: 'user-2',
    email: 'hm@alterna.dev',
    displayName: 'Hiring Manager',
    schedulingLink: 'https://cal.com/jil-s/30min',
  },
];

describe('GET /api/users/interviewers', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (getInterviewers as jest.Mock).mockResolvedValue(mockInterviewers);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns 401 when not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
    expect(getInterviewers).not.toHaveBeenCalled();
  });

  it('returns 403 when user lacks app access', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthNoAccess);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden - App access required');
    expect(getInterviewers).not.toHaveBeenCalled();
  });

  it('returns interviewers for hiring managers', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthHiringManager);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.interviewers).toEqual(mockInterviewers);
    expect(getInterviewers).toHaveBeenCalledTimes(1);
    expect(response.headers.get('Cache-Control')).toBe('private, no-cache');
  });

  it('returns interviewers for admins', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.interviewers).toEqual(mockInterviewers);
  });

  it('returns 500 on service failure', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthHiringManager);
    (getInterviewers as jest.Mock).mockRejectedValue(new Error('DB down'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error fetching interviewers:',
      expect.stringContaining('DB down')
    );
  });
});
