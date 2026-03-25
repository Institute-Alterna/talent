/**
 * PDF Generator Service
 *
 * Handles fetching, sanitizing, and generating PDF reports.
 * This is the main entry point for PDF generation.
 *
 * SECURITY NOTES:
 * - All data is sanitized before PDF generation
 * - PDF buffer is generated in memory (serverless compatible)
 * - No file system writes in production
 */

import { renderToBuffer } from '@react-pdf/renderer';
import { CandidateReportDocument, type CandidateReportProps } from './candidate-report';
import { AuditReportDocument, type AuditReportProps } from './audit-report';
import {
  sanitizeShortTextForPdf,
  sanitizeMediumTextForPdf,
  sanitizeLongTextForPdf,
  sanitizeEmailForPdf,
  sanitizeUrl,
  sanitizeNumber,
  sanitizeBoolean,
  formatDateUtc,
  formatDateOnlyUtc,
  sanitizeIpAddress,
  CONTENT_LIMITS,
  type SanitizedApplicationData,
  type SanitizedAuditLog,
} from './sanitize';
import { ensurePdfFontsRegistered, pdfLabels } from './config';
import { getApplicationDetail } from '@/lib/services/applications';
import { getAuditLogsForApplication, getAuditLogsForPerson } from '@/lib/audit';
import { ensureAbsoluteUrl, getCountryName } from '@/lib/utils';
import type { ApplicationDetail } from '@/types/application';
import { humaniseAuditAction } from '@/lib/audit-display';

const OFFER_WITHDRAWAL_NOTE = 'Offer withdrawn at agreement stage';

function isOfferWithdrawalNote(note: string | null | undefined): boolean {
  return note === OFFER_WITHDRAWAL_NOTE;
}

/**
 * Options for PDF generation
 */
export interface GeneratePdfOptions {
  /** Include confidentiality notice */
  confidential?: boolean;
  /** Include audit logs in the report */
  includeAuditLogs?: boolean;
  /** Maximum number of audit log entries to include */
  maxAuditLogs?: number;
}

/**
 * Result of PDF generation
 */
export interface GeneratePdfResult {
  /** PDF buffer */
  buffer: Buffer;
  /** Filename for the download */
  filename: string;
  /** Content type */
  contentType: 'application/pdf';
  /** File size in bytes */
  size: number;
}

/**
 * Error thrown when PDF generation fails
 */
export class PdfGenerationError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'PdfGenerationError';
  }
}

/**
 * Build a safe filename from text
 */
function buildSafeFilename(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

/**
 * Build location string from address components
 * Converts country codes to full names
 */
function buildLocation(
  city: string | null,
  state: string | null,
  country: string | null
): string {
  // Convert country code to full name if it's a 2-letter code
  const countryName = country && country.length === 2 ? getCountryName(country) : country;
  const parts = [city, state, countryName].filter(Boolean);
  return parts.join(', ');
}

/**
 * Sanitize application detail data for PDF rendering
 *
 * @param application - Raw application detail from database
 * @returns Sanitized data structure safe for PDF rendering
 */
export function sanitizeApplicationData(application: ApplicationDetail): SanitizedApplicationData {
  const { person, assessments, interviews, decisions, ...app } = application;
  const generalCompetenciesStatus = !person.generalCompetenciesCompleted
    ? 'Not completed'
    : person.generalCompetenciesPassedAt
      ? 'Passed'
      : 'Not passed';

  // Sanitize person data (using PDF-specific functions - no HTML escaping)
  const sanitizedPerson = {
    fullName: sanitizeShortTextForPdf(`${person.firstName} ${person.lastName}`.trim()),
    firstName: sanitizeShortTextForPdf(person.firstName),
    lastName: sanitizeShortTextForPdf(person.lastName),
    email: sanitizeEmailForPdf(person.email),
    secondaryEmail: sanitizeEmailForPdf(person.secondaryEmail),
    phoneNumber: sanitizeMediumTextForPdf(person.phoneNumber),
    location: sanitizeMediumTextForPdf(buildLocation(person.city, person.state, person.country)),
    portfolioLink: sanitizeUrl(ensureAbsoluteUrl(person.portfolioLink || '')),
    educationLevel: sanitizeShortTextForPdf(person.educationLevel),
    generalCompetenciesScore: person.generalCompetenciesScore
      ? sanitizeNumber(person.generalCompetenciesScore.toString(), 2)
      : pdfLabels.common.na,
    generalCompetenciesCompleted: sanitizeBoolean(person.generalCompetenciesCompleted),
    generalCompetenciesPassedAt: formatDateUtc(person.generalCompetenciesPassedAt),
    generalCompetenciesStatus,
  };

  // Calculate missing fields
  const missingFields: string[] = [];
  if (app.hasResume && !app.resumeUrl) missingFields.push('Resume');
  if (app.hasAcademicBg && !app.academicBackground) missingFields.push('Academic Background');
  if (app.hasVideoIntro && !app.videoLink) missingFields.push('Video Introduction');
  if (app.hasPreviousExp && !app.previousExperience) missingFields.push('Previous Experience');
  if (app.hasOtherFile && !app.otherFileUrl) missingFields.push('Other File');

  // Sanitize application data (using PDF-specific functions - no HTML escaping)
  const sanitizedApplication = {
    id: sanitizeShortTextForPdf(app.id) || app.id,
    position: sanitizeShortTextForPdf(app.position),
    currentStage: app.currentStage,
    status: app.status,
    createdAt: formatDateOnlyUtc(app.createdAt),
    updatedAt: formatDateUtc(app.updatedAt),
    agreementSignedAt: formatDateUtc(app.agreementSignedAt),
    resumeUrl: sanitizeUrl(app.resumeUrl),
    academicBackground: sanitizeLongTextForPdf(app.academicBackground),
    previousExperience: sanitizeLongTextForPdf(app.previousExperience),
    videoLink: sanitizeUrl(app.videoLink),
    otherFileUrl: sanitizeUrl(app.otherFileUrl),
    missingFields: missingFields.map(sanitizeShortTextForPdf),
  };

  // Sanitize specialized competency assessments for report clarity.
  const sanitizedAssessments = assessments
    .filter((assessment) => assessment.assessmentType === 'SPECIALIZED_COMPETENCIES')
    .map((assessment) => ({
      type: pdfLabels.assessments.specializedCompetencies,
      competencyName: sanitizeShortTextForPdf(assessment.specialisedCompetency?.name || '—'),
      passed: assessment.passed != null ? sanitizeBoolean(assessment.passed) : '—',
      completedAt: assessment.completedAt ? formatDateUtc(assessment.completedAt) : '—',
      reviewedBy: sanitizeShortTextForPdf(
        assessment.reviewer?.displayName || assessment.reviewedBy || ''
      ),
      reviewedAt: assessment.reviewedAt ? formatDateUtc(assessment.reviewedAt) : '—',
    }));

  // Sanitize interviews (using PDF-specific functions - no HTML escaping)
  const sanitizedInterviews = interviews.map((interview) => ({
    interviewer: sanitizeShortTextForPdf(interview.interviewer.displayName),
    recordingUrl: sanitizeUrl(interview.recordingUrl),
    invitedOn: interview.scheduledAt ? formatDateUtc(interview.scheduledAt) : '',
    completedAt: interview.completedAt ? formatDateUtc(interview.completedAt) : '',
    outcome: interview.outcome,
    notes: sanitizeLongTextForPdf(interview.notes),
  }));

  // Sanitize decisions (using PDF-specific functions - no HTML escaping)
  const sanitizedDecisions = decisions.map((decision) => ({
    decision: decision.decision,
    reason: sanitizeLongTextForPdf(decision.reason),
    notes: sanitizeLongTextForPdf(decision.notes),
    decidedBy: sanitizeShortTextForPdf(decision.user.displayName),
    decidedAt: formatDateUtc(decision.decidedAt),
    isOfferWithdrawal: isOfferWithdrawalNote(decision.notes),
  }));

  return {
    person: sanitizedPerson,
    application: sanitizedApplication,
    assessments: sanitizedAssessments,
    interviews: sanitizedInterviews,
    decisions: sanitizedDecisions,
    generatedAt: formatDateUtc(new Date()),
  };
}

/**
 * Sanitize audit logs for PDF rendering
 *
 * @param logs - Raw audit logs from database
 * @param maxItems - Maximum number of items to include
 * @returns Sanitized audit log array
 */
export function sanitizeAuditLogs(
  logs: Awaited<ReturnType<typeof getAuditLogsForApplication>>,
  maxItems: number = CONTENT_LIMITS.LIST_ITEMS
): SanitizedAuditLog[] {
  return logs.slice(0, maxItems).map((log) => {
    const humanizeDetails =
      log.details && typeof log.details === 'object' && !Array.isArray(log.details)
        ? (log.details as Record<string, unknown>)
        : undefined;

    return {
      action: sanitizeMediumTextForPdf(
        humaniseAuditAction({
          action: log.action,
          actionType: log.actionType,
          details: humanizeDetails,
        })
      ),
      actionType: log.actionType,
      user: log.user ? sanitizeShortTextForPdf(log.user.displayName) : pdfLabels.common.system,
      ipAddress: sanitizeIpAddress(log.ipAddress),
      userAgent: sanitizeMediumTextForPdf(log.userAgent),
      createdAt: formatDateUtc(log.createdAt),
    };
  });
}

/**
 * Generate a candidate report PDF
 *
 * @param applicationId - Application ID to generate report for
 * @param options - PDF generation options
 * @returns PDF buffer and metadata
 * @throws PdfGenerationError if generation fails
 */
export async function generateCandidateReportPdf(
  applicationId: string,
  options: GeneratePdfOptions = {}
): Promise<GeneratePdfResult> {
  const { confidential = true, includeAuditLogs = true, maxAuditLogs = 50 } = options;

  // Validate application ID
  const safeId = sanitizeShortTextForPdf(applicationId);
  if (!safeId) {
    throw new PdfGenerationError('Invalid application ID format');
  }

  try {
    ensurePdfFontsRegistered();

    // Fetch application data
    const application = await getApplicationDetail(safeId);
    if (!application) {
      throw new PdfGenerationError('Application not found');
    }

    // Fetch audit logs if requested
    let auditLogs: SanitizedAuditLog[] = [];
    if (includeAuditLogs) {
      const rawLogs = await getAuditLogsForApplication(safeId, { limit: maxAuditLogs });
      auditLogs = sanitizeAuditLogs(rawLogs, maxAuditLogs);
    }

    // Sanitize all data
    const sanitizedData = sanitizeApplicationData(application);

    // Generate PDF
    const props: CandidateReportProps = {
      data: sanitizedData,
      auditLogs,
      confidential,
    };

    const buffer = await renderToBuffer(CandidateReportDocument(props));

    // Build safe filename
    const candidateName = buildSafeFilename(sanitizedData.person.fullName || 'candidate');
    const position = buildSafeFilename(sanitizedData.application.position || 'application');
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `candidate-report-${candidateName}-${position}-${timestamp}.pdf`;

    return {
      buffer: Buffer.from(buffer),
      filename,
      contentType: 'application/pdf',
      size: buffer.byteLength,
    };
  } catch (error) {
    if (error instanceof PdfGenerationError) {
      throw error;
    }
    throw new PdfGenerationError('Failed to generate candidate report PDF', error);
  }
}

/**
 * Generate an audit log report PDF
 *
 * @param subjectType - Type of subject (person or application)
 * @param subjectId - ID of the subject
 * @param subjectName - Display name for the subject
 * @param options - PDF generation options
 * @returns PDF buffer and metadata
 * @throws PdfGenerationError if generation fails
 */
export async function generateAuditReportPdf(
  subjectType: 'person' | 'application',
  subjectId: string,
  subjectName: string,
  options: GeneratePdfOptions = {}
): Promise<GeneratePdfResult> {
  const { confidential = true, maxAuditLogs = 100 } = options;

  // Validate subject ID
  const safeId = sanitizeShortTextForPdf(subjectId);
  if (!safeId) {
    throw new PdfGenerationError('Invalid subject ID format');
  }

  try {
    ensurePdfFontsRegistered();

    // Fetch audit logs based on subject type
    const rawLogs =
      subjectType === 'person'
        ? await getAuditLogsForPerson(safeId, { limit: maxAuditLogs })
        : await getAuditLogsForApplication(safeId, { limit: maxAuditLogs });

    const auditLogs = sanitizeAuditLogs(rawLogs, maxAuditLogs);

    // Determine date range
    let dateRangeStart: string | undefined;
    let dateRangeEnd: string | undefined;

    if (auditLogs.length > 0) {
      // Logs are in descending order (newest first)
      dateRangeEnd = auditLogs[0].createdAt;
      dateRangeStart = auditLogs[auditLogs.length - 1].createdAt;
    }

    // Generate PDF
    const props: AuditReportProps = {
      subject: sanitizeShortTextForPdf(subjectName),
      subjectType,
      auditLogs,
      dateRangeStart,
      dateRangeEnd,
      generatedAt: formatDateUtc(new Date()),
      confidential,
    };

    const buffer = await renderToBuffer(AuditReportDocument(props));

    // Build safe filename
    const safeName = buildSafeFilename(subjectName || 'audit');
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `audit-report-${subjectType}-${safeName}-${timestamp}.pdf`;

    return {
      buffer: Buffer.from(buffer),
      filename,
      contentType: 'application/pdf',
      size: buffer.byteLength,
    };
  } catch (error) {
    if (error instanceof PdfGenerationError) {
      throw error;
    }
    throw new PdfGenerationError('Failed to generate audit report PDF', error);
  }
}

/**
 * Validate that a PDF can be generated for the given application
 * Use this to pre-check before attempting generation
 *
 * @param applicationId - Application ID to validate
 * @returns Boolean indicating if PDF can be generated
 */
export async function canGeneratePdf(applicationId: string): Promise<boolean> {
  const safeId = sanitizeShortTextForPdf(applicationId);
  if (!safeId) {
    return false;
  }

  try {
    const application = await getApplicationDetail(safeId);
    return application !== null;
  } catch {
    return false;
  }
}

/**
 * Export types for external use
 */
export type { SanitizedApplicationData, SanitizedAuditLog };
