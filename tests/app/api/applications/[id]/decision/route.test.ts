/**
 * Decision Route Tests
 *
 * Tests for POST /api/applications/[id]/decision
 *
 * @jest-environment node
 */

import { POST } from '@/app/api/applications/[id]/decision/route';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  db: {
    decision: {
      create: jest.fn(),
    },
    application: {
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    emailLog: {
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
  advanceApplicationStage: jest.fn(),
}));

jest.mock('@/lib/email', () => ({
  sendOfferLetter: jest.fn().mockResolvedValue({ success: true }),
  sendRejection: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/lib/email/templates', () => ({
  escapeHtml: jest.fn((text: string) => text),
}));

jest.mock('@/lib/audit', () => ({
  logDecisionMade: jest.fn(),
  logStatusChange: jest.fn(),
  logStageChange: jest.fn(),
}));

jest.mock('@/lib/security', () => ({
  sanitizeForLog: jest.fn((s: unknown) => String(s)),
  sanitizeText: jest.fn((s: string) => s),
}));

import { requireApplicationAccess, parseJsonBody } from '@/lib/api-helpers';
import { updateApplicationStatus, advanceApplicationStage } from '@/lib/services/applications';
import { sendOfferLetter } from '@/lib/email';
import { logStageChange } from '@/lib/audit';
import { db } from '@/lib/db';

describe('POST /api/applications/[id]/decision', () => {
  let consoleErrorSpy: jest.SpyInstance;

  const mockApplication = {
    id: 'app-123',
    personId: 'person-123',
    position: 'Software Developer',
    currentStage: 'INTERVIEW',
    status: 'ACTIVE',
    decisions: [],
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
    return new NextRequest('http://localhost/api/applications/app-123/decision', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  describe('ACCEPT decision', () => {
    it('advances stage to AGREEMENT on acceptance', async () => {
      (parseJsonBody as jest.Mock).mockResolvedValue({
        ok: true,
        body: { decision: 'ACCEPT', reason: 'Excellent candidate', startDate: '2026-04-01' },
      });

      (db.decision.create as jest.Mock).mockResolvedValue({
        id: 'dec-123',
        decision: 'ACCEPT',
        reason: 'Excellent candidate',
        notes: null,
        decidedAt: new Date(),
        user: { id: 'user-123', displayName: 'Admin', email: 'admin@alterna.dev' },
      });

      const request = createRequest({ decision: 'ACCEPT', reason: 'Excellent candidate' });
      const response = await POST(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Should advance to AGREEMENT stage
      expect(advanceApplicationStage).toHaveBeenCalledWith('app-123', 'AGREEMENT');

      // Should log the stage change
      expect(logStageChange).toHaveBeenCalledWith(
        'app-123',
        'person-123',
        'INTERVIEW',
        'AGREEMENT',
        'user-123',
        'Auto-advanced: Application accepted'
      );
    });

    it('sends offer letter with agreement link on acceptance', async () => {
      // sendEmail is forced to true for ACCEPT decisions (even if body says false)
      (parseJsonBody as jest.Mock).mockResolvedValue({
        ok: true,
        body: { decision: 'ACCEPT', reason: 'Great fit', sendEmail: false },
      });

      (db.decision.create as jest.Mock).mockResolvedValue({
        id: 'dec-123',
        decision: 'ACCEPT',
        reason: 'Great fit',
        notes: null,
        decidedAt: new Date(),
        user: { id: 'user-123', displayName: 'Admin', email: 'admin@alterna.dev' },
      });

      const request = createRequest({ decision: 'ACCEPT', reason: 'Great fit' });
      await POST(request, { params: mockParams });

      // Should send offer letter
      expect(sendOfferLetter).toHaveBeenCalledWith(
        'person-123',
        'app-123',
        'test@example.com',
        'Test',
        'Software Developer',
        expect.any(Date),
        undefined
      );
    });
  });

  describe('REJECT decision', () => {
    it('does NOT advance stage on rejection', async () => {
      (parseJsonBody as jest.Mock).mockResolvedValue({
        ok: true,
        body: { decision: 'REJECT', reason: 'Not a good fit for the role' },
      });

      (db.decision.create as jest.Mock).mockResolvedValue({
        id: 'dec-456',
        decision: 'REJECT',
        reason: 'Not a good fit for the role',
        notes: null,
        decidedAt: new Date(),
        user: { id: 'user-123', displayName: 'Admin', email: 'admin@alterna.dev' },
      });

      const request = createRequest({ decision: 'REJECT', reason: 'Not a good fit for the role' });
      const response = await POST(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Should NOT advance stage
      expect(advanceApplicationStage).not.toHaveBeenCalled();
      expect(logStageChange).not.toHaveBeenCalled();

      // Should still update status
      expect(updateApplicationStatus).toHaveBeenCalledWith('app-123', 'REJECTED');
    });
  });

  describe('Validation', () => {
    it('allows a decision at any active stage (no interview gate)', async () => {
      (requireApplicationAccess as jest.Mock).mockResolvedValue({
        ok: true,
        session: { user: { dbUserId: 'user-123' } },
        application: { ...mockApplication, currentStage: 'GENERAL_COMPETENCIES' },
      });

      (parseJsonBody as jest.Mock).mockResolvedValue({
        ok: true,
        body: { decision: 'REJECT', reason: 'Not a good fit' },
      });

      (db.decision.create as jest.Mock).mockResolvedValue({
        id: 'decision-123',
        decision: 'REJECT',
        reason: 'Not a good fit',
        decidedAt: new Date(),
        user: { id: 'user-123', displayName: 'Admin', email: 'admin@example.com' },
      });

      const request = createRequest({ decision: 'REJECT', reason: 'Not a good fit' });
      const response = await POST(request, { params: mockParams });

      expect(response.status).toBe(200);
    });

    it('returns 400 when decision already exists', async () => {
      (requireApplicationAccess as jest.Mock).mockResolvedValue({
        ok: true,
        session: { user: { dbUserId: 'user-123' } },
        application: { ...mockApplication, decisions: [{ id: 'existing-dec' }] },
      });

      (parseJsonBody as jest.Mock).mockResolvedValue({
        ok: true,
        body: { decision: 'ACCEPT', reason: 'Test' },
      });

      const request = createRequest({ decision: 'ACCEPT', reason: 'Test' });
      const response = await POST(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('already been recorded');
    });

    it('returns 400 for rejection without reason', async () => {
      (parseJsonBody as jest.Mock).mockResolvedValue({
        ok: true,
        body: { decision: 'REJECT' },
      });

      const request = createRequest({ decision: 'REJECT' });
      const response = await POST(request, { params: mockParams });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Reason is required');
    });
  });
});
