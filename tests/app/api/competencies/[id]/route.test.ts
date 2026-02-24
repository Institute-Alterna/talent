/**
 * /api/competencies/[id] Route Tests
 *
 * Unit tests for GET, PUT, DELETE /api/competencies/[id]
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
  getCompetencyById: jest.fn(),
  updateCompetency: jest.fn(),
  deactivateCompetency: jest.fn(),
}));

// Mock security
jest.mock('@/lib/security', () => {
  const actual = jest.requireActual('@/lib/security');
  return { ...actual, sanitizeForLog: jest.fn((s) => s) };
});

import { GET, PUT, DELETE } from '@/app/api/competencies/[id]/route';
import { auth } from '@/lib/auth';
import { getCompetencyById, updateCompetency, deactivateCompetency } from '@/lib/services/competencies';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const validId = 'a1b2c3d4-1234-4567-890a-bcdef1234567';
const invalidId = 'not-a-uuid';

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
    name: 'HM',
    isAdmin: false,
    hasAccess: true,
    dbUserId: 'db-user-2',
  },
};

const mockCompetency = {
  id: validId,
  name: 'Python Proficiency',
  category: 'Technical',
  tallyFormUrl: 'https://tally.so/r/python',
  criterion: 'Write clean Python code',
  isActive: true,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const makeParams = (id: string) => Promise.resolve({ id });

const makePutRequest = (id: string, body: Record<string, unknown>) =>
  new NextRequest(`http://localhost:3000/api/competencies/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const makeDeleteRequest = (id: string) =>
  new NextRequest(`http://localhost:3000/api/competencies/${id}`, {
    method: 'DELETE',
  });

const makeGetRequest = (id: string) =>
  new NextRequest(`http://localhost:3000/api/competencies/${id}`);

// ---------------------------------------------------------------------------
// GET /api/competencies/[id]
// ---------------------------------------------------------------------------

describe('GET /api/competencies/[id]', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => consoleSpy.mockRestore());

  it('returns 401 when unauthenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    const res = await GET(makeGetRequest(validId), { params: makeParams(validId) });
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid UUID', async () => {
    (auth as jest.Mock).mockResolvedValue(mockHiringManager);
    const res = await GET(makeGetRequest(invalidId), { params: makeParams(invalidId) });
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain('Invalid competency ID');
  });

  it('returns 404 when competency not found', async () => {
    (auth as jest.Mock).mockResolvedValue(mockHiringManager);
    (getCompetencyById as jest.Mock).mockResolvedValue(null);
    const res = await GET(makeGetRequest(validId), { params: makeParams(validId) });
    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data.error).toContain('Competency not found');
  });

  it('returns competency when found', async () => {
    (auth as jest.Mock).mockResolvedValue(mockHiringManager);
    (getCompetencyById as jest.Mock).mockResolvedValue(mockCompetency);
    const res = await GET(makeGetRequest(validId), { params: makeParams(validId) });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.competency.id).toBe(validId);
  });

  it('returns 500 on unexpected error', async () => {
    (auth as jest.Mock).mockResolvedValue(mockHiringManager);
    (getCompetencyById as jest.Mock).mockRejectedValue(new Error('DB error'));
    const res = await GET(makeGetRequest(validId), { params: makeParams(validId) });
    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/competencies/[id]
// ---------------------------------------------------------------------------

describe('PUT /api/competencies/[id]', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (getCompetencyById as jest.Mock).mockResolvedValue(mockCompetency);
  });

  afterEach(() => consoleSpy.mockRestore());

  it('returns 401 when unauthenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    const res = await PUT(makePutRequest(validId, { name: 'New Name' }), {
      params: makeParams(validId),
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin users', async () => {
    (auth as jest.Mock).mockResolvedValue(mockHiringManager);
    const res = await PUT(makePutRequest(validId, { name: 'New Name' }), {
      params: makeParams(validId),
    });
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid UUID', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAdmin);
    const res = await PUT(makePutRequest(invalidId, { name: 'New Name' }), {
      params: makeParams(invalidId),
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 when competency not found', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAdmin);
    (getCompetencyById as jest.Mock).mockResolvedValue(null);
    const res = await PUT(makePutRequest(validId, { name: 'New Name' }), {
      params: makeParams(validId),
    });
    expect(res.status).toBe(404);
  });

  it('returns 400 when no valid fields provided', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAdmin);
    const res = await PUT(makePutRequest(validId, {}), { params: makeParams(validId) });
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain('No valid fields');
  });

  it('updates name successfully', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAdmin);
    (updateCompetency as jest.Mock).mockResolvedValue({ ...mockCompetency, name: 'New Name' });

    const res = await PUT(makePutRequest(validId, { name: 'New Name' }), {
      params: makeParams(validId),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.competency.name).toBe('New Name');
  });

  it('returns 400 when name exceeds 200 characters', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAdmin);
    const res = await PUT(makePutRequest(validId, { name: 'A'.repeat(201) }), {
      params: makeParams(validId),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when category is invalid', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAdmin);
    const res = await PUT(makePutRequest(validId, { category: 'BadCategory' }), {
      params: makeParams(validId),
    });
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain('Category must be one of');
  });

  it('returns 400 when tallyFormUrl is not a valid URL', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAdmin);
    const res = await PUT(makePutRequest(validId, { tallyFormUrl: 'not-a-url' }), {
      params: makeParams(validId),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when isActive is not a boolean', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAdmin);
    const res = await PUT(makePutRequest(validId, { isActive: 'yes' }), {
      params: makeParams(validId),
    });
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain('isActive must be a boolean');
  });

  it('can toggle isActive to false (alternative soft-delete path)', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAdmin);
    (updateCompetency as jest.Mock).mockResolvedValue({ ...mockCompetency, isActive: false });

    const res = await PUT(makePutRequest(validId, { isActive: false }), {
      params: makeParams(validId),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.competency.isActive).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/competencies/[id]
// ---------------------------------------------------------------------------

describe('DELETE /api/competencies/[id]', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (getCompetencyById as jest.Mock).mockResolvedValue(mockCompetency);
  });

  afterEach(() => consoleSpy.mockRestore());

  it('returns 401 when unauthenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    const res = await DELETE(makeDeleteRequest(validId), { params: makeParams(validId) });
    expect(res.status).toBe(401);
  });

  it('returns 403 for non-admin users', async () => {
    (auth as jest.Mock).mockResolvedValue(mockHiringManager);
    const res = await DELETE(makeDeleteRequest(validId), { params: makeParams(validId) });
    expect(res.status).toBe(403);
  });

  it('returns 400 for invalid UUID', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAdmin);
    const res = await DELETE(makeDeleteRequest(invalidId), { params: makeParams(invalidId) });
    expect(res.status).toBe(400);
  });

  it('returns 404 when competency not found', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAdmin);
    (getCompetencyById as jest.Mock).mockResolvedValue(null);
    const res = await DELETE(makeDeleteRequest(validId), { params: makeParams(validId) });
    expect(res.status).toBe(404);
  });

  it('returns 400 when competency is already deactivated', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAdmin);
    (getCompetencyById as jest.Mock).mockResolvedValue({ ...mockCompetency, isActive: false });
    const res = await DELETE(makeDeleteRequest(validId), { params: makeParams(validId) });
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toContain('already deactivated');
  });

  it('soft-deletes competency and returns 200', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAdmin);
    (deactivateCompetency as jest.Mock).mockResolvedValue({ ...mockCompetency, isActive: false });

    const res = await DELETE(makeDeleteRequest(validId), { params: makeParams(validId) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(deactivateCompetency).toHaveBeenCalledWith(validId);
    expect(data.competency.isActive).toBe(false);
    expect(data.message).toContain('deactivated');
  });

  it('returns 500 on unexpected error', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAdmin);
    (deactivateCompetency as jest.Mock).mockRejectedValue(new Error('DB error'));

    const res = await DELETE(makeDeleteRequest(validId), { params: makeParams(validId) });
    expect(res.status).toBe(500);
  });
});
