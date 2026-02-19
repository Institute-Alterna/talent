/**
 * Persons API Route Tests
 *
 * Tests for the /api/persons endpoint.
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock persons service
jest.mock('@/lib/services/persons', () => ({
  getPersons: jest.fn(),
  getPersonStats: jest.fn(),
}));

// Mock security
jest.mock('@/lib/security', () => ({
  sanitizeForLog: jest.fn((s) => s),
}));

import { GET } from '@/app/api/persons/route';
import { auth } from '@/lib/auth';
import { getPersons, getPersonStats } from '@/lib/services/persons';

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

const mockPersons = [
  {
    id: 'person-1',
    email: 'john@example.com',
    firstName: 'John',
    lastName: 'Doe',
    country: 'US',
    generalCompetenciesCompleted: true,
    generalCompetenciesScore: '85.00',
    createdAt: new Date('2024-01-15'),
    _count: { applications: 2 },
  },
  {
    id: 'person-2',
    email: 'jane@example.com',
    firstName: 'Jane',
    lastName: 'Smith',
    country: 'MX',
    generalCompetenciesCompleted: false,
    generalCompetenciesScore: null,
    createdAt: new Date('2024-01-16'),
    _count: { applications: 1 },
  },
];

const mockPersonsResult = {
  persons: mockPersons,
  total: 2,
  page: 1,
  limit: 20,
  totalPages: 1,
};

const mockStats = {
  total: 10,
  withActiveApplications: 5,
  completedGeneralCompetencies: 7,
  passedGeneralCompetencies: 6,
  hiredAsUsers: 2,
};

describe('GET /api/persons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getPersons as jest.Mock).mockResolvedValue(mockPersonsResult);
    (getPersonStats as jest.Mock).mockResolvedValue(mockStats);
  });

  it('returns 401 when not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/persons');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 for users without app access', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthNoAccess);

    const request = new NextRequest('http://localhost:3000/api/persons');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden - App access required');
  });

  it('returns persons for admin users', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = new NextRequest('http://localhost:3000/api/persons');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.persons).toHaveLength(2);
    expect(data.persons[0].id).toBe('person-1');
    expect(data.persons[0].email).toBe('john@example.com');
    expect(data.total).toBe(2);
    expect(data.stats).toEqual(mockStats);
  });

  it('returns persons for hiring managers', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthHiringManager);

    const request = new NextRequest('http://localhost:3000/api/persons');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.persons).toHaveLength(2);
    expect(data.persons[0].id).toBe('person-1');
  });

  it('passes search parameter to getPersons', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = new NextRequest('http://localhost:3000/api/persons?search=john');
    await GET(request);

    expect(getPersons).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'john',
      })
    );
  });

  it('truncates overly long search parameters', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const longSearch = 'a'.repeat(200);
    const request = new NextRequest(`http://localhost:3000/api/persons?search=${longSearch}`);
    await GET(request);

    expect(getPersons).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'a'.repeat(100),
      })
    );
  });

  it('passes generalCompetenciesCompleted filter', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = new NextRequest('http://localhost:3000/api/persons?generalCompetenciesCompleted=true');
    await GET(request);

    expect(getPersons).toHaveBeenCalledWith(
      expect.objectContaining({
        generalCompetenciesCompleted: true,
      })
    );
  });

  it('passes hasActiveApplications filter', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = new NextRequest('http://localhost:3000/api/persons?hasActiveApplications=true');
    await GET(request);

    expect(getPersons).toHaveBeenCalledWith(
      expect.objectContaining({
        hasActiveApplications: true,
      })
    );
  });

  it('passes pagination parameters', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = new NextRequest('http://localhost:3000/api/persons?page=2&limit=50');
    await GET(request);

    expect(getPersons).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        limit: 50,
      })
    );
  });

  it('enforces maximum limit of 100', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = new NextRequest('http://localhost:3000/api/persons?limit=500');
    await GET(request);

    expect(getPersons).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 100,
      })
    );
  });

  it('handles invalid pagination parameters gracefully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = new NextRequest('http://localhost:3000/api/persons?page=-1&limit=abc');
    await GET(request);

    expect(getPersons).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 20,
      })
    );
  });

  it('returns 500 on error', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);
    (getPersons as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/persons');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
