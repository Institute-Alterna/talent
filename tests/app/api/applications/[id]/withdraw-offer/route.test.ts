/**
 * Withdraw Offer Route Tests
 *
 * Tests for POST /api/applications/[id]/withdraw-offer
 *
 * @jest-environment node
 */

import { POST } from '@/app/api/applications/[id]/withdraw-offer/route';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  db: {
    decision: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/api-helpers', () => ({
  requireApplicationAccess: jest.fn(),
  parseJsonBody: jest.fn(),
}));

jest.mock('@/lib/services/applications', () => ({
  updateApplicationStatus: jest.fn(),
}));

jest.mock('@/lib/email', () => ({
  sendRejection: jest.fn().mockResolvedValue({ success: true, queued: false, emailLogId: 'log-123' }),
}));

jest.mock('@/lib/email/templates', () => ({
  escapeHtml: jest.fn((text: string) => text),
}));

jest.mock('@/lib/audit', () => ({
  logDecisionMade: jest.fn(),
  logStatusChange: jest.fn(),
}));

jest.mock('@/lib/security', () => ({
  sanitizeForLog: jest.fn((s: unknown) => String(s)),
  sanitizeText: jest.fn((s: string) => s),
}));

import { requireApplicationAccess, parseJsonBody } from '@/lib/api-helpers';
import { updateApplicationStatus } from '@/lib/services/applications';
import { sendRejection } from '@/lib/email';
import { logDecisionMade, logStatusChange } from '@/lib/audit';
import { db } from '@/lib/db';

describe('POST /api/applications/[id]/withdraw-offer', () => {
  let consoleErrorSpy: jest.SpyInstance;

  const mockApplication = {
    id: 'app-123',
    personId: 'person-123',
    position: 'Software Developer',
    currentStage: 'AGREEMENT',
    status: 'ACCEPTED',
    person: {
      id: 'person-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
    },
  };

  const mockParams = Promise.resolve({ id: 'app-123' });

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    (requireApplicationAccess as jest.Mock).mockResolvedValue({
      ok: true,
      session: { user: { dbUserId: 'user-123' } },
      application: mockApplication,
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  function createRequest(body: Record<string, unknown>): NextRequest {
    return new NextRequest('http://localhost/api/applications/app-123/withdraw-offer', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  describe('Access control', () => {
    it('rejects non-admin users', async () => {
      const mockError = new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
      (requireApplicationAccess as jest.Mock).mockResolvedValue({
        ok: false,
        error: mockError,
      });

      const request = createRequest({ reason: 'Test reason' });
      const response = await POST(request, { params: mockParams });

      expect(response.status).toBe(403);
    });

    it('rejects unauthenticated users', async () => {
      const mockError = new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      (requireApplicationAccess as jest.Mock).mockResolvedValue({
        ok: false,
        error: mockError,
      });

      const request = createRequest({ reason: 'Test reason' });
      const response = await POST(request, { params: mockParams });

      expect(response.status).toBe(401);
    });

    it('requires admin access level', async () => {
      const request = createRequest({ reason: 'Test reason' });
      await POST(request, { params: mockParams });

      expect(requireApplicationAccess).toHaveBeenCalledWith(mockParams, { level: 'admin' });
    });
  });

  describe('Validation', () => {
    it('rejects when application is not ACCEPTED', async () => {
      (requireApplicationAccess as jest.Mock).mockResolvedValue({
        ok: true,
        session: { user: { dbUserId: 'user-123' } },
        application: { ...mockApplication, status: 'ACTIVE' },
      });

      (parseJsonBody as jest.Mock).mockResolvedValue({
        ok: true,
        body: { reason: 'Test reason' },
      });

      const request = createRequest({ reason: 'Test reason' });
      const response = await POST(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('not accepted');
    });

    it('rejects when application is not at AGREEMENT stage', async () => {
      (requireApplicationAccess as jest.Mock).mockResolvedValue({
        ok: true,
        session: { user: { dbUserId: 'user-123' } },
        application: { ...mockApplication, currentStage: 'INTERVIEW' },
      });

      (parseJsonBody as jest.Mock).mockResolvedValue({
        ok: true,
        body: { reason: 'Test reason' },
      });

      const request = createRequest({ reason: 'Test reason' });
      const response = await POST(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('not at agreement stage');
    });

    it('rejects missing reason', async () => {
      (parseJsonBody as jest.Mock).mockResolvedValue({
        ok: true,
        body: { reason: '' },
      });

      const request = createRequest({ reason: '' });
      const response = await POST(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Reason is required');
    });

    it('rejects missing user profile', async () => {
      (requireApplicationAccess as jest.Mock).mockResolvedValue({
        ok: true,
        session: { user: { dbUserId: null } },
        application: mockApplication,
      });

      const request = createRequest({ reason: 'Test reason' });
      const response = await POST(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('User profile not found');
    });

    it('handles invalid JSON body', async () => {
      const mockError = new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
      (parseJsonBody as jest.Mock).mockResolvedValue({
        ok: false,
        error: mockError,
      });

      const request = createRequest({ reason: 'Test' });
      const response = await POST(request, { params: mockParams });

      expect(response.status).toBe(400);
    });
  });

  describe('Happy path', () => {
    beforeEach(() => {
      (parseJsonBody as jest.Mock).mockResolvedValue({
        ok: true,
        body: { reason: 'Budget constraints', sendEmail: true },
      });

      (db.decision.create as jest.Mock).mockResolvedValue({
        id: 'dec-123',
        decision: 'REJECT',
        reason: 'Budget constraints',
        notes: 'Offer withdrawn at agreement stage',
        decidedAt: new Date(),
        user: {
          id: 'user-123',
          displayName: 'Admin User',
          email: 'admin@example.com',
        },
      });
    });

    it('successfully withdraws offer', async () => {
      const request = createRequest({ reason: 'Budget constraints', sendEmail: true });
      const response = await POST(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.applicationStatus).toBe('REJECTED');
    });

    it('creates REJECT decision record', async () => {
      const request = createRequest({ reason: 'Budget constraints' });
      await POST(request, { params: mockParams });

      expect(db.decision.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          applicationId: 'app-123',
          decision: 'REJECT',
          reason: 'Budget constraints',
          notes: 'Offer withdrawn at agreement stage',
          decidedBy: 'user-123',
        }),
      }));
    });

    it('updates application status to REJECTED', async () => {
      const request = createRequest({ reason: 'Budget constraints' });
      await POST(request, { params: mockParams });

      expect(updateApplicationStatus).toHaveBeenCalledWith('app-123', 'REJECTED');
    });

    it('logs decision and status change', async () => {
      const request = createRequest({ reason: 'Budget constraints' });
      await POST(request, { params: mockParams });

      expect(logDecisionMade).toHaveBeenCalledWith(
        'app-123',
        'person-123',
        'REJECT',
        'Budget constraints',
        'user-123'
      );

      expect(logStatusChange).toHaveBeenCalledWith(
        'app-123',
        'person-123',
        'ACCEPTED',
        'REJECTED',
        'user-123',
        'Offer withdrawn at agreement stage'
      );
    });

    it('sends rejection email when sendEmail is true', async () => {
      const request = createRequest({ reason: 'Budget constraints', sendEmail: true });
      const response = await POST(request, { params: mockParams });
      const data = await response.json();

      expect(sendRejection).toHaveBeenCalledWith(
        'person-123',
        'app-123',
        'test@example.com',
        'Test',
        'Software Developer',
        'Budget constraints'
      );
      expect(data.emailSent).toBe(true);
    });

    it('skips email when sendEmail is false', async () => {
      (parseJsonBody as jest.Mock).mockResolvedValue({
        ok: true,
        body: { reason: 'Budget constraints', sendEmail: false },
      });

      const request = createRequest({ reason: 'Budget constraints', sendEmail: false });
      const response = await POST(request, { params: mockParams });
      const data = await response.json();

      expect(sendRejection).not.toHaveBeenCalled();
      expect(data.emailSent).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('returns 500 on internal server error', async () => {
      (parseJsonBody as jest.Mock).mockResolvedValue({
        ok: true,
        body: { reason: 'Budget constraints' },
      });

      (db.decision.create as jest.Mock).mockRejectedValue(new Error('Database error'));

      const request = createRequest({ reason: 'Budget constraints' });
      const response = await POST(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
