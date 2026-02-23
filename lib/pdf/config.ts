/**
 * PDF Template Configuration
 *
 * Editable configuration for PDF report generation.
 * Customize styles, colors, fonts, and structure without modifying core components.
 *
 * CUSTOMIZATION GUIDE:
 * - Modify `pdfStyles` to change fonts, colors, spacing
 * - Modify `pdfTemplates` to add/remove sections
 * - Modify `pdfLabels` to change text content
 */

import { branding } from '@/config/branding';

/**
 * Font configuration for PDF documents
 */
export const pdfFonts = {
  /**
   * Primary font family for headings
   */
  heading: 'Helvetica-Bold',

  /**
   * Primary font family for body text
   */
  body: 'Helvetica',

  /**
   * Monospace font for code/data
   */
  mono: 'Courier',
} as const;

/**
 * Color palette for PDF documents
 * Derived from branding configuration
 */
export const pdfColors = {
  /**
   * Primary brand color (headers, accents)
   */
  primary: branding.primaryColor,

  /**
   * Secondary brand color (subheaders)
   */
  secondary: branding.secondaryColor,

  /**
   * Success color (passed, accepted)
   */
  success: branding.successColor,

  /**
   * Warning color (pending, attention needed)
   */
  warning: branding.warningColor,

  /**
   * Danger color (failed, rejected)
   */
  danger: branding.dangerColor,

  /**
   * Primary text color
   */
  text: '#1F2937',

  /**
   * Secondary text color (muted)
   */
  textMuted: '#6B7280',

  /**
   * Light gray for borders and backgrounds
   */
  border: '#E5E7EB',

  /**
   * Background color for alternating rows
   */
  backgroundAlt: '#F9FAFB',

  /**
   * White background
   */
  white: '#FFFFFF',
} as const;

/**
 * Spacing and sizing configuration
 */
export const pdfSpacing = {
  /**
   * Page margins (in points)
   */
  pageMargin: {
    top: 50,
    bottom: 50,
    left: 40,
    right: 40,
  },

  /**
   * Section spacing
   */
  sectionGap: 20,

  /**
   * Paragraph spacing
   */
  paragraphGap: 10,

  /**
   * Line height multiplier
   */
  lineHeight: 1.5,
} as const;

/**
 * Font sizes configuration
 */
export const pdfFontSizes = {
  /**
   * Document title
   */
  title: 24,

  /**
   * Section headers
   */
  sectionHeader: 16,

  /**
   * Subsection headers
   */
  subsectionHeader: 12,

  /**
   * Normal body text
   */
  body: 10,

  /**
   * Small text (captions, footnotes)
   */
  small: 8,

  /**
   * Page numbers
   */
  pageNumber: 8,
} as const;

/**
 * Page configuration
 */
export const pdfPageConfig = {
  /**
   * Page size (A4, Letter, etc.)
   */
  size: 'A4' as const,

  /**
   * Page orientation
   */
  orientation: 'portrait' as const,

  /**
   * Whether to include page numbers
   */
  showPageNumbers: true,

  /**
   * Page number position
   */
  pageNumberPosition: 'bottom-right' as const,
} as const;

/**
 * Labels and text strings for PDF content
 * Edit these to change displayed text or translate
 */
export const pdfLabels = {
  /**
   * Report headers
   */
  report: {
    candidateReport: 'Candidate Report',
    auditReport: 'Activity Audit Report',
    generatedOn: 'Generated on',
    page: 'Page',
    of: 'of',
    confidential: 'Candidate Information is Confidential.',
    internalUseOnly: 'This document should be for Internal Use Only and shared with authorised parties, including where required by law, if requested.',
  },

  /**
   * Person section labels
   */
  person: {
    sectionTitle: 'Personal Information',
    name: 'Name',
    email: 'Email',
    secondaryEmail: 'Secondary Email',
    phone: 'Phone',
    location: 'Location',
    portfolio: 'Portfolio',
    education: 'Education Level',
  },

  /**
   * Application section labels
   */
  application: {
    sectionTitle: 'Application Details',
    position: 'Position',
    stage: 'Current Stage',
    status: 'Status',
    appliedOn: 'Applied On',
    lastUpdated: 'Last Updated',
    applicationId: 'Application ID',
    resume: 'Resume',
    video: 'Video Introduction',
    otherFiles: 'Other Files',
    viewLink: 'View',
    missingFieldsWarning: 'Missing Fields',
  },

  /**
   * Academic background section labels
   */
  academic: {
    sectionTitle: 'Academic Background',
    noContent: 'No academic background provided.',
  },

  /**
   * Previous experience section labels
   */
  experience: {
    sectionTitle: 'Previous Experience',
    noContent: 'No previous experience provided.',
  },

  /**
   * Assessment section labels
   */
  assessments: {
    sectionTitle: 'Assessments',
    generalCompetencies: 'General Competencies',
    specializedCompetencies: 'Specialised Competencies',
    score: 'Score',
    threshold: 'Threshold',
    result: 'Result',
    passed: 'Passed',
    failed: 'Failed',
    completedOn: 'Completed On',
    notCompleted: 'Not yet completed',
    noAssessments: 'No assessments recorded.',
  },

  /**
   * Interview section labels
   */
  interviews: {
    sectionTitle: 'Interviews',
    interviewer: 'Interviewer',
    schedulingLink: 'Scheduling Link',
    scheduledFor: 'Scheduled For',
    completedOn: 'Completed On',
    outcome: 'Outcome',
    notes: 'Notes',
    pending: 'Pending',
    accept: 'Accept',
    reject: 'Reject',
    noInterviews: 'No interviews scheduled.',
  },

  /**
   * Decision section labels
   */
  decisions: {
    sectionTitle: 'Hiring Decisions',
    decision: 'Decision',
    reason: 'Reason',
    notes: 'Notes',
    decidedBy: 'Decided By',
    decidedOn: 'Decided On',
    accepted: 'Accepted',
    rejected: 'Rejected',
    noDecisions: 'No decisions recorded.',
  },

  /**
   * Activity section labels
   */
  activity: {
    sectionTitle: 'Activity Log',
    action: 'Action',
    type: 'Type',
    user: 'User',
    timestamp: 'Timestamp',
    details: 'Details',
    ipAddress: 'IP Address',
    noActivity: 'No activity recorded.',
  },

  /**
   * Status labels
   */
  status: {
    ACTIVE: 'Active',
    ACCEPTED: 'Accepted',
    REJECTED: 'Rejected',
  },

  /**
   * Stage labels
   */
  stage: {
    APPLICATION: 'Application',
    GENERAL_COMPETENCIES: 'General Competencies',
    SPECIALIZED_COMPETENCIES: 'Specialised Competencies',
    INTERVIEW: 'Interview',
    AGREEMENT: 'Agreement',
    SIGNED: 'Signed',
  },

  /**
   * Common labels
   */
  common: {
    na: 'N/A',
    notProvided: 'Not provided',
    yes: 'Yes',
    no: 'No',
    system: 'System',
  },
} as const;

/**
 * Template section configuration
 * Enable/disable sections in the candidate report
 */
export const pdfSections = {
  candidateReport: {
    /**
     * Show header with logo and title
     */
    showHeader: true,

    /**
     * Show personal information section
     */
    showPersonalInfo: true,

    /**
     * Show application details section
     */
    showApplicationDetails: true,

    /**
     * Show academic background section
     */
    showAcademicBackground: true,

    /**
     * Show previous experience section
     */
    showPreviousExperience: true,

    /**
     * Show assessments section
     */
    showAssessments: true,

    /**
     * Show interviews section
     */
    showInterviews: true,

    /**
     * Show decisions section
     */
    showDecisions: true,

    /**
     * Show activity log section
     */
    showActivityLog: true,

    /**
     * Show footer with confidentiality notice
     */
    showFooter: true,
  },

  auditReport: {
    /**
     * Show header with logo and title
     */
    showHeader: true,

    /**
     * Show summary statistics
     */
    showSummary: true,

    /**
     * Show detailed log entries
     */
    showDetails: true,

    /**
     * Show IP addresses in log
     */
    showIpAddresses: true,

    /**
     * Show user agents in log
     */
    showUserAgents: false,

    /**
     * Show footer with confidentiality notice
     */
    showFooter: true,
  },
} as const;

/**
 * Export configuration type for type safety
 */
export type PDFColors = typeof pdfColors;
export type PDFSpacing = typeof pdfSpacing;
export type PDFFontSizes = typeof pdfFontSizes;
export type PDFLabels = typeof pdfLabels;
export type PDFSections = typeof pdfSections;

/**
 * Status color mapping
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'ACTIVE':
      return pdfColors.primary;
    case 'ACCEPTED':
      return pdfColors.success;
    case 'REJECTED':
      return pdfColors.danger;
    default:
      return pdfColors.text;
  }
}

/**
 * Stage color mapping
 */
export function getStageColor(stage: string): string {
  switch (stage) {
    case 'APPLICATION':
      return pdfColors.textMuted;
    case 'GENERAL_COMPETENCIES':
    case 'SPECIALIZED_COMPETENCIES':
      return pdfColors.primary;
    case 'INTERVIEW':
      return pdfColors.warning;
    case 'AGREEMENT':
      return pdfColors.secondary;
    case 'SIGNED':
      return pdfColors.success;
    default:
      return pdfColors.text;
  }
}

/**
 * Result color mapping (pass/fail)
 */
export function getResultColor(passed: boolean): string {
  return passed ? pdfColors.success : pdfColors.danger;
}

/**
 * Interview outcome color mapping
 */
export function getOutcomeColor(outcome: string): string {
  switch (outcome) {
    case 'ACCEPT':
      return pdfColors.success;
    case 'REJECT':
      return pdfColors.danger;
    case 'PENDING':
    default:
      return pdfColors.warning;
  }
}
