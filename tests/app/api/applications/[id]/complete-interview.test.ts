/**
 * Complete Interview API Route Tests
 *
 * Integration tests for the complete interview endpoint.
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
  createAuditLog: jest.fn(),
  logInterviewCompleted: jest.fn(),
}));

// Mock security
jest.mock('@/lib/security', () => {
  const actual = jest.requireActual('@/lib/security');
  return {
    ...actual,
    sanitizeForLog: jest.fn((s) => s),
  };
});

import { POST } from '@/app/api/applications/[id]/complete-interview/route';
import { auth } from '@/lib/auth';
import { getApplicationDetail } from '@/lib/services/applications';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

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
  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    (auth as jest.Mock).mockResolvedValue(mockSession);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
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
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[Complete Interview] No active interview found for application:',
      expect.any(String)
    );
  });

  it('returns 403 when user is neither admin nor assigned interviewer', async () => {
    (auth as jest.Mock).mockResolvedValue({
      ...mockSession,
      user: {
        ...mockSession.user,
        isAdmin: false,
        dbUserId: 'another-interviewer-id',
      },
    });
    (getApplicationDetail as jest.Mock).mockResolvedValue(mockApplication);
    (db.interview.findFirst as jest.Mock).mockResolvedValue(mockInterview);

    const request = new NextRequest('http://localhost:3000/api/applications/550e8400-e29b-41d4-a716-446655440000/complete-interview', {
      method: 'POST',
      body: JSON.stringify({ notes: 'Interview went well.' }),
    });
    const params = Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden - Only the assigned interviewer or an admin can complete this interview');
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId: mockApplication.id,
        action: 'Unauthorised attempt to complete interview',
        actionType: 'UPDATE',
      })
    );
  });

  it('allows assigned interviewer to complete interview without admin role', async () => {
    (auth as jest.Mock).mockResolvedValue({
      ...mockSession,
      user: {
        ...mockSession.user,
        isAdmin: false,
        dbUserId: mockInterview.interviewerId,
      },
    });
    (getApplicationDetail as jest.Mock).mockResolvedValue(mockApplication);
    (db.interview.findFirst as jest.Mock).mockResolvedValue(mockInterview);
    (db.interview.update as jest.Mock).mockResolvedValue({
      ...mockInterview,
      completedAt: new Date(),
      notes: 'Assigned interviewer completed interview.',
      recordingUrl: null,
    });

    const request = new NextRequest('http://localhost:3000/api/applications/550e8400-e29b-41d4-a716-446655440000/complete-interview', {
      method: 'POST',
      body: JSON.stringify({ notes: 'Assigned interviewer completed interview.' }),
    });
    const params = Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Interview marked as completed');
  });

  it('successfully completes interview with valid notes', async () => {
    (getApplicationDetail as jest.Mock).mockResolvedValue(mockApplication);
    (db.interview.findFirst as jest.Mock).mockResolvedValue(mockInterview);
    (db.interview.update as jest.Mock).mockResolvedValue({
      ...mockInterview,
      completedAt: new Date(),
      notes: 'Interview went well. Strong technical skills.',
      recordingUrl: null,
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

  it('successfully completes interview with valid HTTPS recording URL', async () => {
    (getApplicationDetail as jest.Mock).mockResolvedValue(mockApplication);
    (db.interview.findFirst as jest.Mock).mockResolvedValue(mockInterview);
    (db.interview.update as jest.Mock).mockResolvedValue({
      ...mockInterview,
      completedAt: new Date(),
      notes: 'Interview completed with recording.',
      recordingUrl: 'https://www.loom.com/share/abc123',
    });

    const request = new NextRequest('http://localhost:3000/api/applications/550e8400-e29b-41d4-a716-446655440000/complete-interview', {
      method: 'POST',
      body: JSON.stringify({
        notes: 'Interview completed with recording.',
        recordingUrl: 'https://www.loom.com/share/abc123',
      }),
    });
    const params = Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.interview.recordingUrl).toBe('https://www.loom.com/share/abc123');
    expect(db.interview.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          recordingUrl: 'https://www.loom.com/share/abc123',
        }),
      })
    );
  });

  it('does not update recording URL when field is omitted', async () => {
    (getApplicationDetail as jest.Mock).mockResolvedValue(mockApplication);
    (db.interview.findFirst as jest.Mock).mockResolvedValue(mockInterview);
    (db.interview.update as jest.Mock).mockResolvedValue({
      ...mockInterview,
      completedAt: new Date(),
      notes: 'Interview completed without recording URL.',
      recordingUrl: null,
    });

    const request = new NextRequest('http://localhost:3000/api/applications/550e8400-e29b-41d4-a716-446655440000/complete-interview', {
      method: 'POST',
      body: JSON.stringify({ notes: 'Interview completed without recording URL.' }),
    });
    const params = Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' });

    const response = await POST(request, { params });

    expect(response.status).toBe(200);
    const updateCall = (db.interview.update as jest.Mock).mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty('recordingUrl');
  });

  it('returns 400 when recording URL is not HTTPS', async () => {
    (getApplicationDetail as jest.Mock).mockResolvedValue(mockApplication);
    (db.interview.findFirst as jest.Mock).mockResolvedValue(mockInterview);

    const request = new NextRequest('http://localhost:3000/api/applications/550e8400-e29b-41d4-a716-446655440000/complete-interview', {
      method: 'POST',
      body: JSON.stringify({
        notes: 'Interview notes',
        recordingUrl: 'http://www.loom.com/share/abc123',
      }),
    });
    const params = Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Recording URL must be a valid HTTPS URL');
  });

  it('returns 400 when recording URL is not a string', async () => {
    (getApplicationDetail as jest.Mock).mockResolvedValue(mockApplication);
    (db.interview.findFirst as jest.Mock).mockResolvedValue(mockInterview);

    const request = new NextRequest('http://localhost:3000/api/applications/550e8400-e29b-41d4-a716-446655440000/complete-interview', {
      method: 'POST',
      body: JSON.stringify({
        notes: 'Interview notes',
        recordingUrl: 123,
      }),
    });
    const params = Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Recording URL must be a string');
  });

  it('returns 400 when recording URL exceeds max length', async () => {
    (getApplicationDetail as jest.Mock).mockResolvedValue(mockApplication);
    (db.interview.findFirst as jest.Mock).mockResolvedValue(mockInterview);

    const tooLongUrl = `https://www.loom.com/share/${'a'.repeat(600)}`;
    const request = new NextRequest('http://localhost:3000/api/applications/550e8400-e29b-41d4-a716-446655440000/complete-interview', {
      method: 'POST',
      body: JSON.stringify({
        notes: 'Interview notes',
        recordingUrl: tooLongUrl,
      }),
    });
    const params = Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440000' });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Recording URL cannot exceed');
  });

  it('sanitizes notes to prevent injection attacks', async () => {
    (getApplicationDetail as jest.Mock).mockResolvedValue(mockApplication);
    (db.interview.findFirst as jest.Mock).mockResolvedValue(mockInterview);
    (db.interview.update as jest.Mock).mockResolvedValue({
      ...mockInterview,
      completedAt: new Date(),
      notes: 'Test notes without null bytes',
      recordingUrl: null,
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
      recordingUrl: null,
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
