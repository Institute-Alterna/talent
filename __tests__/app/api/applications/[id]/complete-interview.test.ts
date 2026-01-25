/**
 * Complete Interview API Route Tests
 *
 * Integration tests for the complete interview endpoint.
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock applications service
jest.mock('@/lib/services/applications', () => ({
  getApplicationDetail: jest.fn(),
}));

// Mock database
jest.mock('@/lib/db', () => ({
  db: {
    interview: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock audit
jest.mock('@/lib/audit', () => ({
  logInterviewCompleted: jest.fn(),
}));

// Mock security
jest.mock('@/lib/security', () => ({
  sanitizeForLog: jest.fn((s) => s),
}));

import { POST } from '@/app/api/applications/[id]/complete-interview/route';
import { auth } from '@/lib/auth';
import { getApplicationDetail } from '@/lib/services/applications';
import { db } from '@/lib/db';
import { logInterviewCompleted } from '@/lib/audit';

const mockSession = {
  user: {
    id: 'user-123',
    dbUserId: 'db-user-123',
    email: 'test@example.com',
    name: 'Test User',
    isAdmin: true,
    hasAccess: true,
  },
};

const mockApplication = {
  id: 'app-123',
  personId: 'person-123',
  position: 'Software Engineer',
  currentStage: 'INTERVIEW',
  status: 'ACTIVE',
  person: {
    id: 'person-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
  },
};

const mockInterview = {
  id: 'interview-123',
  applicationId: 'app-123',
  interviewerId: 'interviewer-123',
  schedulingLink: 'https://calendly.com/interviewer',
  scheduledAt: null,
  completedAt: null,
  notes: null,
  outcome: 'PENDING',
  emailSentAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('POST /api/applications/[id]/complete-interview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockResolvedValue(mockSession);
  });

  it('returns 401 when not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/applications/550e8400-e29b-41d4-a716-446655440000/complete-interview', {
      method: 'POST',
      body: JSON.stringify({ notes: 'Interview went well' }),
    });
    const params = Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 when user lacks app access', async () => {
    (auth as jest.Mock).mockResolvedValue({
      ...mockSession,
      user: { ...mockSession.user, hasAccess: false },
    });

    const request = new NextRequest('http://localhost:3000/api/applications/550e8400-e29b-41d4-a716-446655440000/complete-interview', {
      method: 'POST',
      body: JSON.stringify({ notes: 'Interview went well' }),
    });
    const params = Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toContain('Forbidden');
  });

  it('returns 400 when application ID is invalid UUID', async () => {
    const request = new NextRequest('http://localhost:3000/api/applications/invalid-id/complete-interview', {
      method: 'POST',
      body: JSON.stringify({ notes: 'Interview went well' }),
    });
    const params = Promise.resolve({ id: 'invalid-id' });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid application ID format');
  });

  it('returns 400 when notes are missing', async () => {
    (getApplicationDetail as jest.Mock).mockResolvedValue(mockApplication);
    (db.interview.findFirst as jest.Mock).mockResolvedValue(mockInterview);

    const request = new NextRequest('http://localhost:3000/api/applications/550e8400-e29b-41d4-a716-446655440000/complete-interview', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const params = Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Interview notes are required');
  });

  it('returns 400 when notes are empty', async () => {
    (getApplicationDetail as jest.Mock).mockResolvedValue(mockApplication);
    (db.interview.findFirst as jest.Mock).mockResolvedValue(mockInterview);

    const request = new NextRequest('http://localhost:3000/api/applications/550e8400-e29b-41d4-a716-446655440000/complete-interview', {
      method: 'POST',
      body: JSON.stringify({ notes: '   ' }),
    });
    const params = Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Interview notes are required');
  });

  it('returns 404 when no active interview found', async () => {
    (getApplicationDetail as jest.Mock).mockResolvedValue(mockApplication);
    (db.interview.findFirst as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/applications/550e8400-e29b-41d4-a716-446655440000/complete-interview', {
      method: 'POST',
      body: JSON.stringify({ notes: 'Interview went well' }),
    });
    const params = Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('No active interview found to complete');
  });

  it('successfully completes interview with valid notes', async () => {
    (getApplicationDetail as jest.Mock).mockResolvedValue(mockApplication);
    (db.interview.findFirst as jest.Mock).mockResolvedValue(mockInterview);
    (db.interview.update as jest.Mock).mockResolvedValue({
      ...mockInterview,
      completedAt: new Date(),
      notes: 'Interview went well. Strong technical skills.',
    });

    const request = new NextRequest('http://localhost:3000/api/applications/550e8400-e29b-41d4-a716-446655440000/complete-interview', {
      method: 'POST',
      body: JSON.stringify({ notes: 'Interview went well. Strong technical skills.' }),
    });
    const params = Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Interview marked as completed');
    expect(data.interview.notes).toBe('Interview went well. Strong technical skills.');
    expect(data.interview.completedAt).toBeDefined();
  });

  it('sanitizes notes to prevent injection attacks', async () => {
    (getApplicationDetail as jest.Mock).mockResolvedValue(mockApplication);
    (db.interview.findFirst as jest.Mock).mockResolvedValue(mockInterview);
    (db.interview.update as jest.Mock).mockResolvedValue({
      ...mockInterview,
      completedAt: new Date(),
      notes: 'Test notes without null bytes',
    });

    const request = new NextRequest('http://localhost:3000/api/applications/550e8400-e29b-41d4-a716-446655440000/complete-interview', {
      method: 'POST',
      body: JSON.stringify({ notes: 'Test notes\0with null bytes' }),
    });
    const params = Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' });

    const response = await POST(request, { params });

    expect(response.status).toBe(200);
    // Verify notes were sanitized by checking they don't contain null bytes
    expect(db.interview.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          notes: expect.not.stringContaining('\0'),
        }),
      })
    );
  });

  it('truncates very long notes to prevent abuse', async () => {
    (getApplicationDetail as jest.Mock).mockResolvedValue(mockApplication);
    (db.interview.findFirst as jest.Mock).mockResolvedValue(mockInterview);
    (db.interview.update as jest.Mock).mockResolvedValue({
      ...mockInterview,
      completedAt: new Date(),
      notes: 'a'.repeat(2000),
    });

    const veryLongNotes = 'a'.repeat(3000); // Exceeds 2000 char limit
    const request = new NextRequest('http://localhost:3000/api/applications/550e8400-e29b-41d4-a716-446655440000/complete-interview', {
      method: 'POST',
      body: JSON.stringify({ notes: veryLongNotes }),
    });
    const params = Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' });

    const response = await POST(request, { params });

    expect(response.status).toBe(200);
    // Verify notes were truncated to max 2000 chars
    const updateCall = (db.interview.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data.notes.length).toBeLessThanOrEqual(2000);
  });
});
