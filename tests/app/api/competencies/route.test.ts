/**
 * /api/competencies Route Tests
 *
 * Unit tests for GET and POST /api/competencies
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock competencies service
jest.mock('@/lib/services/competencies', () => ({
  listCompetencies: jest.fn(),
  createCompetency: jest.fn(),
}));

// Mock security
jest.mock('@/lib/security', () => {
  const actual = jest.requireActual('@/lib/security');
  return { ...actual, sanitizeForLog: jest.fn((s) => s) };
});

import { GET, POST } from '@/app/api/competencies/route';
import { auth } from '@/lib/auth';
import { listCompetencies, createCompetency } from '@/lib/services/competencies';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockAdmin = {
  user: {
    id: 'user-1',
    email: 'admin@example.com',
    name: 'Admin',
    isAdmin: true,
    hasAccess: true,
    dbUserId: 'db-user-1',
  },
};

const mockHiringManager = {
  user: {
    id: 'user-2',
    email: 'hm@example.com',
    name: 'Hiring Manager',
    isAdmin: false,
    hasAccess: true,
    dbUserId: 'db-user-2',
  },
};

const mockNoAccess = {
  user: {
    id: 'user-3',
    email: 'noop@example.com',
    name: 'No Access',
    isAdmin: false,
    hasAccess: false,
    dbUserId: 'db-user-3',
  },
};

const mockCompetency = {
  id: 'sc-uuid-0000-1111-2222-333333333333',
  name: 'Python Proficiency',
  category: 'Technical',
  tallyFormUrl: 'https://tally.so/r/python',
  criterion: 'Write clean Python code',
  isActive: true,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const makePostRequest = (body: Record<string, unknown>) =>
  new NextRequest('http://localhost:3000/api/competencies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

// ---------------------------------------------------------------------------
// GET /api/competencies
// ---------------------------------------------------------------------------

describe('GET /api/competencies', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => consoleSpy.mockRestore());

  it('returns 401 when unauthenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 403 when user has no app access', async () => {
    (auth as jest.Mock).mockResolvedValue(mockNoAccess);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it('returns active-only competencies for hiring managers', async () => {
    (auth as jest.Mock).mockResolvedValue(mockHiringManager);
    (listCompetencies as jest.Mock).mockResolvedValue([mockCompetency]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(listCompetencies).toHaveBeenCalledWith(true);
    expect(data.competencies).toHaveLength(1);
  });

  it('returns all competencies (including inactive) for admins', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAdmin);
    const inactive = { ...mockCompetency, isActive: false, id: 'sc-inactive' };
    (listCompetencies as jest.Mock).mockResolvedValue([mockCompetency, inactive]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(listCompetencies).toHaveBeenCalledWith(false);
    expect(data.competencies).toHaveLength(2);
  });

  it('returns 500 on unexpected error', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAdmin);
    (listCompetencies as jest.Mock).mockRejectedValue(new Error('DB offline'));

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

// ---------------------------------------------------------------------------
// POST /api/competencies
// ---------------------------------------------------------------------------

describe('POST /api/competencies', () => {
  let consoleSpy: jest.SpyInstance;

  const validBody = {
    name: 'Python Proficiency',
    category: 'Technical',
    tallyFormUrl: 'https://tally.so/r/python',
    criterion: 'Write clean Python with tests',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => consoleSpy.mockRestore());

  it('returns 401 when unauthenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    const res = await POST(makePostRequest(validBody));
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin users', async () => {
    (auth as jest.Mock).mockResolvedValue(mockHiringManager);
    const res = await POST(makePostRequest(validBody));
    expect(res.status).toBe(403);
  });

  it('creates competency and returns 201 for admin', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAdmin);
    (createCompetency as jest.Mock).mockResolvedValue(mockCompetency);

    const res = await POST(makePostRequest(validBody));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.competency.id).toBe(mockCompetency.id);
    expect(createCompetency).toHaveBeenCalledWith(validBody);
  });

  it('returns 400 when name is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAdmin);
    const res = await POST(makePostRequest({ ...validBody, name: '' }));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain('Name is required');
  });

  it('returns 400 when name exceeds 200 characters', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAdmin);
    const res = await POST(makePostRequest({ ...validBody, name: 'A'.repeat(201) }));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain('Name is required');
  });

  it('returns 400 when category is invalid', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAdmin);
    const res = await POST(makePostRequest({ ...validBody, category: 'InvalidCategory' }));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain('Category must be one of');
  });

  it('returns 400 when tallyFormUrl is not a valid URL', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAdmin);
    const res = await POST(makePostRequest({ ...validBody, tallyFormUrl: 'not-a-url' }));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain('valid Tally form URL');
  });

  it('returns 400 when criterion is missing', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAdmin);
    const res = await POST(makePostRequest({ ...validBody, criterion: '' }));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain('Criterion is required');
  });

  it('returns 400 when criterion exceeds 2000 characters', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAdmin);
    const res = await POST(makePostRequest({ ...validBody, criterion: 'C'.repeat(2001) }));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain('Criterion is required');
  });

  it('returns 400 for malformed JSON body', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAdmin);
    const req = new NextRequest('http://localhost:3000/api/competencies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json{{{',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('accepts all valid scCategories', async () => {
    const validCategories = ['Technical', 'Creative', 'Leadership', 'Communication', 'Analytical'];

    for (const category of validCategories) {
      jest.clearAllMocks();
      (auth as jest.Mock).mockResolvedValue(mockAdmin);
      (createCompetency as jest.Mock).mockResolvedValue({ ...mockCompetency, category });

      const res = await POST(makePostRequest({ ...validBody, category }));
      expect(res.status).toBe(201);
    }
  });

  it('returns 500 on unexpected error', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAdmin);
    (createCompetency as jest.Mock).mockRejectedValue(new Error('DB error'));

    const res = await POST(makePostRequest(validBody));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
