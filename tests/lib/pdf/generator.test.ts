/**
 * Unit tests for PDF generator service.
 *
 * These are fast, dependency-isolated tests to keep PDF coverage efficient.
 */

import type { ApplicationDetail } from '@/types/application';

const mockRenderToBuffer = jest.fn();
const mockCandidateReportDocument = jest.fn();
const mockAuditReportDocument = jest.fn();
const mockEnsurePdfFontsRegistered = jest.fn();
const mockGetApplicationDetail = jest.fn();
const mockGetAuditLogsForApplication = jest.fn();
const mockGetAuditLogsForPerson = jest.fn();
const mockHumaniseAuditAction = jest.fn((input?: unknown) => {
  void input;
  return 'Humanized action';
});

jest.mock('@react-pdf/renderer', () => ({
  renderToBuffer: (...args: unknown[]) => mockRenderToBuffer(...args),
}));

jest.mock('@/lib/pdf/candidate-report', () => ({
  CandidateReportDocument: (...args: unknown[]) => mockCandidateReportDocument(...args),
}));

jest.mock('@/lib/pdf/audit-report', () => ({
  AuditReportDocument: (...args: unknown[]) => mockAuditReportDocument(...args),
}));

jest.mock('@/lib/pdf/config', () => ({
  ensurePdfFontsRegistered: () => mockEnsurePdfFontsRegistered(),
  pdfLabels: {
    common: {
      na: 'N/A',
      system: 'System',
    },
    assessments: {
      generalCompetencies: 'General Competencies',
      specializedCompetencies: 'Specialized Competencies',
    },
  },
}));

jest.mock('@/lib/services/applications', () => ({
  getApplicationDetail: (...args: unknown[]) => mockGetApplicationDetail(...args),
}));

jest.mock('@/lib/audit', () => ({
  getAuditLogsForApplication: (...args: unknown[]) => mockGetAuditLogsForApplication(...args),
  getAuditLogsForPerson: (...args: unknown[]) => mockGetAuditLogsForPerson(...args),
}));

jest.mock('@/lib/utils', () => ({
  ensureAbsoluteUrl: (url: string) => url,
  getCountryName: (country: string) => country,
}));

jest.mock('@/lib/audit-display', () => ({
  humaniseAuditAction: (input: unknown) => mockHumaniseAuditAction(input),
}));

import { generateCandidateReportPdf, PdfGenerationError } from '@/lib/pdf/generator';

function makeMinimalApplication(id: string): ApplicationDetail {
  return {
    id,
    personId: 'person-1',
    position: 'Course Facilitator',
    currentStage: 'APPLICATION',
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
    agreementSignedAt: null,
    agreementTallySubmissionId: null,
    agreementData: null,
    tallySubmissionId: 'tally-submission',
    tallyResponseId: null,
    tallyFormId: null,
    person: {
      id: 'person-1',
      firstName: 'Amara',
      middleName: null,
      lastName: 'Osei',
      email: 'amara@example.com',
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
      generalCompetenciesInvitedAt: null,
    },
    assessments: [],
    interviews: [],
    decisions: [],
    createdAt: new Date('2026-03-01T10:00:00.000Z'),
    updatedAt: new Date('2026-03-01T10:00:00.000Z'),
  } as ApplicationDetail;
}

describe('lib/pdf/generator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetApplicationDetail.mockResolvedValue(
      makeMinimalApplication('123e4567-e89b-12d3-a456-426614174000')
    );
    mockGetAuditLogsForApplication.mockResolvedValue([]);
    mockGetAuditLogsForPerson.mockResolvedValue([]);
    mockCandidateReportDocument.mockReturnValue('candidate-doc');
    mockAuditReportDocument.mockReturnValue('audit-doc');
    mockRenderToBuffer.mockResolvedValue(Buffer.from('PDF'));
  });

  it('registers fonts and generates candidate PDF for early-stage candidates', async () => {
    const result = await generateCandidateReportPdf('123e4567-e89b-12d3-a456-426614174000', {
      includeAuditLogs: false,
    });

    expect(mockEnsurePdfFontsRegistered).toHaveBeenCalledTimes(1);
    expect(mockGetApplicationDetail).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
    expect(mockGetAuditLogsForApplication).not.toHaveBeenCalled();
    expect(mockRenderToBuffer).toHaveBeenCalledTimes(1);
    expect(result.contentType).toBe('application/pdf');
    expect(result.size).toBeGreaterThan(0);
  });

  it('throws PdfGenerationError for invalid application id format', async () => {
    await expect(generateCandidateReportPdf('')).rejects.toBeInstanceOf(PdfGenerationError);
    expect(mockEnsurePdfFontsRegistered).not.toHaveBeenCalled();
    expect(mockRenderToBuffer).not.toHaveBeenCalled();
  });
});
