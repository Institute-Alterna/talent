/**
 * PDF Export API Route Tests
 *
 * Tests for the /api/applications/[id]/export-pdf endpoint.
 * Covers authentication, authorization, validation, and error handling.
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

// Define mock functions at module level
const mockAuth = jest.fn();
const mockGenerateCandidateReportPdf = jest.fn();
const mockGenerateAuditReportPdf = jest.fn();
const mockGetApplicationDetail = jest.fn();
const mockCreateAuditLog = jest.fn();
const mockSanitizeForLog = jest.fn((x: unknown) => x);

// Mock auth module
jest.mock('@/lib/auth', () => ({
  auth: () => mockAuth(),
}));

// Mock PDF module with inline error class
jest.mock('@/lib/pdf', () => {
  class PdfGenerationError extends Error {
    constructor(
      message: string,
      public readonly cause?: unknown
    ) {
      super(message);
      this.name = 'PdfGenerationError';
    }
  }
  return {
    generateCandidateReportPdf: (...args: unknown[]) => mockGenerateCandidateReportPdf(...args),
    generateAuditReportPdf: (...args: unknown[]) => mockGenerateAuditReportPdf(...args),
    PdfGenerationError,
  };
});

// Mock applications service
jest.mock('@/lib/services/applications', () => ({
  getApplicationDetail: (...args: unknown[]) => mockGetApplicationDetail(...args),
}));

// Mock audit module
jest.mock('@/lib/audit', () => ({
  createAuditLog: (...args: unknown[]) => mockCreateAuditLog(...args),
}));

// Mock security module
jest.mock('@/lib/security', () => ({
  sanitizeForLog: (x: unknown) => mockSanitizeForLog(x),
}));

import { GET } from '@/app/api/applications/[id]/export-pdf/route';

// Get the PdfGenerationError from the mock for use in tests
const { PdfGenerationError } = jest.requireMock('@/lib/pdf') as {
  PdfGenerationError: new (message: string, cause?: unknown) => Error;
};

describe('GET /api/applications/[id]/export-pdf', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';

  const mockSession = {
    user: {
      id: 'okta-123',
      email: 'user@example.com',
      name: 'Test User',
      isAdmin: false,
      hasAccess: true,
      dbUserId: 'db-user-123',
    },
  };

  const mockApplication = {
    id: validUuid,
    personId: 'person-123',
    position: 'Software Engineer',
    currentStage: 'INTERVIEW',
    status: 'ACTIVE',
    resumeUrl: null,
    academicBackground: null,
    previousExperience: null,
    videoLink: null,
    otherFileUrl: null,
    hasResume: false,
    hasAcademicBg: false,
    hasVideoIntro: false,
    hasPreviousExp: false,
    hasOtherFile: false,
    tallySubmissionId: 'tally-123',
    tallyResponseId: null,
    tallyFormId: null,
    person: {
      id: 'person-123',
      firstName: 'John',
      middleName: null,
      lastName: 'Doe',
      email: 'john@example.com',
      secondaryEmail: null,
      phoneNumber: null,
      country: null,
      city: null,
      state: null,
      countryCode: null,
      portfolioLink: null,
      educationLevel: null,
      generalCompetenciesCompleted: false,
      generalCompetenciesScore: null,
      generalCompetenciesPassedAt: null,
    },
    assessments: [],
    interviews: [],
    decisions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPdfResult = {
    buffer: Buffer.from('PDF content'),
    filename: 'candidate-report.pdf',
    contentType: 'application/pdf' as const,
    size: 100,
  };

  function createRequest(params?: { type?: string; includeAuditLogs?: string; confidential?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set('type', params.type);
    if (params?.includeAuditLogs) searchParams.set('includeAuditLogs', params.includeAuditLogs);
    if (params?.confidential) searchParams.set('confidential', params.confidential);

    const url = `http://localhost/api/applications/${validUuid}/export-pdf?${searchParams.toString()}`;
    return new NextRequest(url);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue(mockSession);
    mockGetApplicationDetail.mockResolvedValue(mockApplication);
    mockGenerateCandidateReportPdf.mockResolvedValue(mockPdfResult);
    mockGenerateAuditReportPdf.mockResolvedValue(mockPdfResult);
    mockCreateAuditLog.mockResolvedValue({});
  });

  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const request = createRequest();
      const response = await GET(request, { params: Promise.resolve({ id: validUuid }) });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 403 when user has no app access', async () => {
      mockAuth.mockResolvedValue({
        user: { ...mockSession.user, hasAccess: false },
      });

      const request = createRequest();
      const response = await GET(request, { params: Promise.resolve({ id: validUuid }) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Forbidden - App access required');
    });
  });

  describe('Validation', () => {
    it('should return 400 for invalid UUID format', async () => {
      const request = new NextRequest('http://localhost/api/applications/invalid-id/export-pdf');

      const response = await GET(request, { params: Promise.resolve({ id: 'invalid-id' }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid application ID format');
    });

    it('should return 400 for invalid report type', async () => {
      const request = createRequest({ type: 'invalid' });

      const response = await GET(request, { params: Promise.resolve({ id: validUuid }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid report type');
    });

    it('should return 404 when application not found', async () => {
      mockGetApplicationDetail.mockResolvedValue(null);

      const request = createRequest();
      const response = await GET(request, { params: Promise.resolve({ id: validUuid }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Application not found');
    });
  });

  describe('Candidate Report Generation', () => {
    it('should generate candidate report with default options', async () => {
      const request = createRequest();

      const response = await GET(request, { params: Promise.resolve({ id: validUuid }) });

      expect(response.status).toBe(200);
      expect(mockGenerateCandidateReportPdf).toHaveBeenCalledWith(validUuid, {
        confidential: true,
        includeAuditLogs: true,
        maxAuditLogs: 50,
      });
    });

    it('should respect includeAuditLogs=false parameter', async () => {
      const request = createRequest({ includeAuditLogs: 'false' });

      await GET(request, { params: Promise.resolve({ id: validUuid }) });

      expect(mockGenerateCandidateReportPdf).toHaveBeenCalledWith(
        validUuid,
        expect.objectContaining({ includeAuditLogs: false })
      );
    });

    it('should respect confidential=false parameter', async () => {
      const request = createRequest({ confidential: 'false' });

      await GET(request, { params: Promise.resolve({ id: validUuid }) });

      expect(mockGenerateCandidateReportPdf).toHaveBeenCalledWith(
        validUuid,
        expect.objectContaining({ confidential: false })
      );
    });
  });

  describe('Audit Report Generation', () => {
    it('should generate audit report when type=audit', async () => {
      const request = createRequest({ type: 'audit' });

      const response = await GET(request, { params: Promise.resolve({ id: validUuid }) });

      expect(response.status).toBe(200);
      expect(mockGenerateAuditReportPdf).toHaveBeenCalledWith(
        'application',
        validUuid,
        'John Doe',
        expect.objectContaining({ confidential: true, maxAuditLogs: 100 })
      );
    });
  });

  describe('Response Headers', () => {
    it('should return PDF with correct headers', async () => {
      const request = createRequest();

      const response = await GET(request, { params: Promise.resolve({ id: validUuid }) });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/pdf');
      expect(response.headers.get('Content-Disposition')).toContain('attachment');
      expect(response.headers.get('Content-Disposition')).toContain('filename=');
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('Cache-Control')).toContain('no-cache');
    });
  });

  describe('Audit Logging', () => {
    it('should log PDF export action', async () => {
      const request = createRequest();

      await GET(request, { params: Promise.resolve({ id: validUuid }) });

      expect(mockCreateAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          personId: 'person-123',
          applicationId: validUuid,
          userId: 'db-user-123',
          action: expect.stringContaining('PDF'),
          actionType: 'VIEW',
          details: expect.objectContaining({
            reportType: 'candidate',
            filename: expect.any(String),
          }),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle PdfGenerationError with "Application not found"', async () => {
      mockGenerateCandidateReportPdf.mockRejectedValue(
        new PdfGenerationError('Application not found')
      );

      const request = createRequest();
      const response = await GET(request, { params: Promise.resolve({ id: validUuid }) });

      expect(response.status).toBe(404);
    });

    it('should handle PdfGenerationError with "Invalid application ID format"', async () => {
      mockGenerateCandidateReportPdf.mockRejectedValue(
        new PdfGenerationError('Invalid application ID format')
      );

      const request = createRequest();
      const response = await GET(request, { params: Promise.resolve({ id: validUuid }) });

      expect(response.status).toBe(400);
    });

    it('should handle generic PdfGenerationError', async () => {
      mockGenerateCandidateReportPdf.mockRejectedValue(
        new PdfGenerationError('Rendering failed', new Error('Canvas error'))
      );

      const request = createRequest();
      const response = await GET(request, { params: Promise.resolve({ id: validUuid }) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('Failed to generate PDF');
    });

    it('should handle unexpected errors', async () => {
      mockGenerateCandidateReportPdf.mockRejectedValue(new Error('Unexpected error'));

      const request = createRequest();
      const response = await GET(request, { params: Promise.resolve({ id: validUuid }) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('Security', () => {
    it('should reject SQL injection attempts in UUID', async () => {
      const maliciousId = "'; DROP TABLE applications; --";
      const request = new NextRequest(
        `http://localhost/api/applications/${encodeURIComponent(maliciousId)}/export-pdf`
      );

      const response = await GET(request, {
        params: Promise.resolve({ id: maliciousId }),
      });

      expect(response.status).toBe(400);
      expect(mockGetApplicationDetail).not.toHaveBeenCalled();
    });

    it('should reject path traversal attempts', async () => {
      const maliciousId = '../../../etc/passwd';
      const request = new NextRequest(
        `http://localhost/api/applications/${encodeURIComponent(maliciousId)}/export-pdf`
      );

      const response = await GET(request, {
        params: Promise.resolve({ id: maliciousId }),
      });

      expect(response.status).toBe(400);
      expect(mockGetApplicationDetail).not.toHaveBeenCalled();
    });
  });

  describe('Access Control', () => {
    it('should allow hiring managers to export PDFs', async () => {
      mockAuth.mockResolvedValue({
        user: { ...mockSession.user, isAdmin: false, hasAccess: true },
      });

      const request = createRequest();
      const response = await GET(request, { params: Promise.resolve({ id: validUuid }) });

      expect(response.status).toBe(200);
    });

    it('should allow admins to export PDFs', async () => {
      mockAuth.mockResolvedValue({
        user: { ...mockSession.user, isAdmin: true, hasAccess: true },
      });

      const request = createRequest();
      const response = await GET(request, { params: Promise.resolve({ id: validUuid }) });

      expect(response.status).toBe(200);
    });
  });
});
