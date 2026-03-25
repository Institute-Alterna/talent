/**
 * Candidate Report PDF Component
 *
 * React PDF component for generating comprehensive candidate reports.
 * Uses @react-pdf/renderer for PDF generation.
 *
 * SECURITY: All data must be sanitized before passing to this component.
 * Use the sanitization functions from ./sanitize.ts
 */

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer';
import {
  pdfColors,
  pdfFonts,
  pdfFontSizes,
  pdfSpacing,
  pdfPageConfig,
  pdfLabels,
  pdfSections,
} from './config';
import { FixedPageHeader } from './fixed-page-header';
import type { SanitizedApplicationData, SanitizedAuditLog } from './sanitize';
import { branding } from '@/config/branding';

/**
 * StyleSheet for PDF document
 */
const styles = StyleSheet.create({
  // Page styles
  page: {
    paddingTop: pdfSpacing.pageMargin.top + 62,
    paddingLeft: pdfSpacing.pageMargin.left,
    paddingRight: pdfSpacing.pageMargin.right,
    paddingBottom: pdfSpacing.pageMargin.bottom + 20, // Extra space for footer
    fontFamily: pdfFonts.body,
    fontSize: pdfFontSizes.body,
    color: pdfColors.text,
    backgroundColor: pdfColors.white,
  },

  // Header styles
  pageHeader: {
    position: 'absolute',
    top: 16,
    left: pdfSpacing.pageMargin.left,
    right: pdfSpacing.pageMargin.right,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logo: {
    width: 41,
    height: 14,
  },
  pageConfidentialBlock: {
    maxWidth: 250,
    alignItems: 'flex-start',
  },
  pageConfidentialTitle: {
    fontFamily: pdfFonts.heading,
    fontSize: 7,
    textAlign: 'left',
    color: pdfColors.text,
    marginBottom: 1,
  },
  pageConfidentialCopy: {
    fontSize: 6,
    lineHeight: 1.3,
    textAlign: 'left',
    color: pdfColors.textMuted,
  },
  pageMetaBlock: {
    marginTop: 8,
  },
  pageMetaName: {
    fontFamily: pdfFonts.heading,
    fontSize: 7,
    textAlign: 'left',
    color: pdfColors.text,
    marginBottom: 1,
  },
  pageMetaPosition: {
    fontSize: 6,
    textAlign: 'left',
    color: pdfColors.textMuted,
  },

  header: {
    marginBottom: pdfSpacing.sectionGap,
    borderBottomWidth: 2,
    borderBottomColor: pdfColors.primary,
    paddingBottom: 10,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: pdfFonts.heading,
    fontSize: pdfFontSizes.title,
    color: pdfColors.primary,
  },

  // Section styles
  section: {
    marginBottom: pdfSpacing.sectionGap,
  },
  sectionTitle: {
    fontFamily: pdfFonts.heading,
    fontSize: 13,
    color: pdfColors.text,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.border,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  subsectionTitle: {
    fontFamily: pdfFonts.heading,
    fontSize: 10,
    color: pdfColors.text,
    marginBottom: 5,
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Row styles for key-value pairs
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: 130,
    fontFamily: pdfFonts.heading,
    fontSize: 8,
    color: pdfColors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  value: {
    flex: 1,
    fontSize: pdfFontSizes.body,
    color: pdfColors.text,
  },
  valueLink: {
    color: pdfColors.primary,
    textDecoration: 'none',
  },

  // Badge styles
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: pdfFontSizes.small,
    alignSelf: 'flex-start',
  },
  badgeSuccess: {
    backgroundColor: '#D1FAE5',
    color: pdfColors.success,
  },
  badgeDanger: {
    backgroundColor: '#FEE2E2',
    color: pdfColors.danger,
  },
  badgeWarning: {
    backgroundColor: '#FEF3C7',
    color: pdfColors.warning,
  },
  badgePrimary: {
    backgroundColor: '#DBEAFE',
    color: pdfColors.primary,
  },
  badgeMuted: {
    backgroundColor: '#F3F4F6',
    color: pdfColors.textMuted,
  },

  // Text block styles
  textBlock: {
    marginTop: 5,
    padding: 10,
    backgroundColor: pdfColors.backgroundAlt,
    borderRadius: 4,
    lineHeight: pdfSpacing.lineHeight,
  },

  // Table styles
  table: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: pdfColors.border,
    borderRadius: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: pdfColors.primary,
    padding: 8,
  },
  tableHeaderCell: {
    flex: 1,
    fontFamily: pdfFonts.heading,
    fontSize: pdfFontSizes.small,
    color: pdfColors.white,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.border,
    padding: 8,
  },
  tableRowAlt: {
    backgroundColor: pdfColors.backgroundAlt,
  },
  tableCell: {
    flex: 1,
    fontSize: pdfFontSizes.small,
    color: pdfColors.text,
  },

  // Card styles
  card: {
    marginTop: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: pdfColors.border,
    borderRadius: 6,
    backgroundColor: pdfColors.white,
  },
  cardAlt: {
    backgroundColor: pdfColors.backgroundAlt,
  },

  // Timeline styles
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingLeft: 14,
    borderLeftWidth: 2,
    borderLeftColor: '#CFD4DE',
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 10,
  },
  timelineDate: {
    fontSize: 8,
    color: pdfColors.textMuted,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timelineAction: {
    fontSize: pdfFontSizes.body,
    color: pdfColors.text,
    marginBottom: 2,
  },
  timelineActor: {
    fontSize: 8,
    color: pdfColors.textMuted,
  },

  // Warning box styles
  warningBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: pdfColors.warning,
    borderRadius: 4,
  },
  warningText: {
    color: '#92400E',
    fontSize: pdfFontSizes.small,
  },

  // Footer styles
  footer: {
    position: 'absolute',
    bottom: 20,
    left: pdfSpacing.pageMargin.left,
    right: pdfSpacing.pageMargin.right,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: pdfColors.border,
    paddingTop: 10,
  },
  footerText: {
    fontSize: pdfFontSizes.pageNumber,
    color: pdfColors.textMuted,
  },
  pageNumber: {
    fontSize: pdfFontSizes.pageNumber,
    color: pdfColors.textMuted,
  },

  // Utility styles
  emptyMessage: {
    fontSize: pdfFontSizes.body,
    color: pdfColors.textMuted,
    fontStyle: 'italic',
    marginTop: 5,
  },
  inlineText: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});

/**
 * Props for the CandidateReportDocument component
 */
export interface CandidateReportProps {
  /** Sanitized application data */
  data: SanitizedApplicationData;
  /** Sanitized audit logs */
  auditLogs: SanitizedAuditLog[];
  /** Whether to include confidential notice */
  confidential?: boolean;
}

/**
 * Header Component
 */
function Header() {
  if (!pdfSections.candidateReport.showHeader) return null;

  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{pdfLabels.report.candidateReport}</Text>
    </View>
  );
}

/**
 * Personal Information Section
 */
function PersonalInfoSection({ person }: { person: SanitizedApplicationData['person'] }) {
  if (!pdfSections.candidateReport.showPersonalInfo) return null;

  return (
    <View style={styles.section}>
      <View style={styles.row}>
        <Text style={styles.label}>{pdfLabels.person.name}</Text>
        <Text style={styles.value}>{person.fullName || pdfLabels.common.notProvided}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{pdfLabels.person.email}</Text>
        <Text style={styles.value}>{person.email || pdfLabels.common.notProvided}</Text>
      </View>

      {person.secondaryEmail && (
        <View style={styles.row}>
          <Text style={styles.label}>{pdfLabels.person.secondaryEmail}</Text>
          <Text style={styles.value}>{person.secondaryEmail}</Text>
        </View>
      )}

      <View style={styles.row}>
        <Text style={styles.label}>{pdfLabels.person.phone}</Text>
        <Text style={styles.value}>{person.phoneNumber || pdfLabels.common.notProvided}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{pdfLabels.person.location}</Text>
        <Text style={styles.value}>{person.location || pdfLabels.common.notProvided}</Text>
      </View>

      {person.portfolioLink && (
        <View style={styles.row}>
          <Text style={styles.label}>{pdfLabels.person.portfolio}</Text>
          <Link src={person.portfolioLink} style={[styles.value, styles.valueLink]}>
            {person.portfolioLink}
          </Link>
        </View>
      )}

      <View style={styles.row}>
        <Text style={styles.label}>{pdfLabels.person.education}</Text>
        <Text style={styles.value}>{person.educationLevel || pdfLabels.common.notProvided}</Text>
      </View>
    </View>
  );
}

/**
 * Application Details Section
 */
function ApplicationDetailsSection({
  application,
}: {
  application: SanitizedApplicationData['application'];
}) {
  if (!pdfSections.candidateReport.showApplicationDetails) return null;

  const stageLabel =
    pdfLabels.stage[application.currentStage as keyof typeof pdfLabels.stage] ||
    application.currentStage;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{pdfLabels.application.sectionTitle}</Text>

      <View style={styles.row}>
        <Text style={styles.label}>{pdfLabels.application.applicationId}</Text>
        <Text style={styles.value}>{application.id}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{pdfLabels.application.position}</Text>
        <Text style={styles.value}>{application.position}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{pdfLabels.application.stage}</Text>
        <View style={[styles.badge, styles.badgePrimary]}>
          <Text>{stageLabel}</Text>
        </View>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{pdfLabels.application.status}</Text>
        <StatusBadge status={application.status} />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{pdfLabels.application.appliedOn}</Text>
        <Text style={styles.value}>{application.createdAt}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{pdfLabels.application.lastUpdated}</Text>
        <Text style={styles.value}>{application.updatedAt}</Text>
      </View>

      {/* Links */}
      {application.resumeUrl && (
        <View style={styles.row}>
          <Text style={styles.label}>{pdfLabels.application.resume}</Text>
          <Link src={application.resumeUrl} style={[styles.value, styles.valueLink]}>
            {application.resumeUrl}
          </Link>
        </View>
      )}

      {application.videoLink && (
        <View style={styles.row}>
          <Text style={styles.label}>{pdfLabels.application.video}</Text>
          <Link src={application.videoLink} style={[styles.value, styles.valueLink]}>
            {application.videoLink}
          </Link>
        </View>
      )}

      {application.otherFileUrl && (
        <View style={styles.row}>
          <Text style={styles.label}>{pdfLabels.application.otherFiles}</Text>
          <Link src={application.otherFileUrl} style={[styles.value, styles.valueLink]}>
            {application.otherFileUrl}
          </Link>
        </View>
      )}

      {/* Missing fields warning */}
      {application.missingFields.length > 0 && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            {pdfLabels.application.missingFieldsWarning} {application.missingFields.join(', ')}
          </Text>
        </View>
      )}
    </View>
  );
}

/**
 * Get badge style based on status
 */
function getStatusBadgeStyle(status: string) {
  if (status === 'ACTIVE') return styles.badgePrimary;
  if (status === 'ACCEPTED') return styles.badgeSuccess;
  if (status === 'REJECTED') return styles.badgeDanger;
  return styles.badgeMuted;
}

/**
 * Status Badge Component
 */
function StatusBadge({ status }: { status: string }) {
  const label = pdfLabels.status[status as keyof typeof pdfLabels.status] || status;

  return (
    <View style={[styles.badge, getStatusBadgeStyle(status)]}>
      <Text>{label}</Text>
    </View>
  );
}

/**
 * Academic Background Section
 */
function AcademicBackgroundSection({ content }: { content: string }) {
  if (!pdfSections.candidateReport.showAcademicBackground) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{pdfLabels.academic.sectionTitle}</Text>
      {content ? (
        <View style={styles.textBlock}>
          <Text>{content}</Text>
        </View>
      ) : (
        <Text style={styles.emptyMessage}>{pdfLabels.academic.noContent}</Text>
      )}
    </View>
  );
}

/**
 * Previous Experience Section
 */
function PreviousExperienceSection({ content }: { content: string }) {
  if (!pdfSections.candidateReport.showPreviousExperience) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{pdfLabels.experience.sectionTitle}</Text>
      {content ? (
        <View style={styles.textBlock}>
          <Text>{content}</Text>
        </View>
      ) : (
        <Text style={styles.emptyMessage}>{pdfLabels.experience.noContent}</Text>
      )}
    </View>
  );
}

/**
 * Assessments Section
 */
function AssessmentsSection({
  assessments,
  person,
}: {
  assessments: SanitizedApplicationData['assessments'];
  person: SanitizedApplicationData['person'];
}) {
  if (!pdfSections.candidateReport.showAssessments) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{pdfLabels.assessments.sectionTitle}</Text>

      {/* General Competencies (from person record) */}
      <View style={styles.card}>
        <Text style={styles.subsectionTitle}>{pdfLabels.assessments.generalCompetencies}</Text>

        {person.generalCompetenciesCompleted === 'Yes' ? (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>{pdfLabels.assessments.score}</Text>
              <Text style={styles.value}>{person.generalCompetenciesScore}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Result</Text>
              <Text style={styles.value}>{person.generalCompetenciesStatus}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{pdfLabels.assessments.completedOn}</Text>
              <Text style={styles.value}>{person.generalCompetenciesPassedAt}</Text>
            </View>
          </>
        ) : (
          <Text style={styles.emptyMessage}>{pdfLabels.assessments.notCompleted}</Text>
        )}
      </View>

      {/* Specialized assessments */}
      {assessments.length > 0 ? (
        assessments.map((assessment, index) => (
          <View key={index} style={[styles.card, index % 2 === 1 ? styles.cardAlt : {}]}>
            <Text style={styles.subsectionTitle}>{assessment.type}</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Competency</Text>
              <Text style={styles.value}>{assessment.competencyName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{pdfLabels.assessments.result}</Text>
              {assessment.passed === 'Yes' ? (
                <View style={[styles.badge, styles.badgeSuccess]}>
                  <Text>{pdfLabels.assessments.passed}</Text>
                </View>
              ) : assessment.passed === 'No' ? (
                <View style={[styles.badge, styles.badgeDanger]}>
                  <Text>{pdfLabels.assessments.failed}</Text>
                </View>
              ) : (
                <View style={[styles.badge, styles.badgeWarning]}>
                  <Text>Pending</Text>
                </View>
              )}
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{pdfLabels.assessments.completedOn}</Text>
              <Text style={styles.value}>{assessment.completedAt}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Reviewed by</Text>
              <Text style={styles.value}>{assessment.reviewedBy || pdfLabels.common.notProvided}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Reviewed on</Text>
              <Text style={styles.value}>{assessment.reviewedAt || pdfLabels.common.notProvided}</Text>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.emptyMessage}>{pdfLabels.assessments.noAssessments}</Text>
      )}
    </View>
  );
}

/**
 * Application Journey Section
 */
function JourneySection({
  application,
  interviews,
  decisions,
}: {
  application: SanitizedApplicationData['application'];
  interviews: SanitizedApplicationData['interviews'];
  decisions: SanitizedApplicationData['decisions'];
}) {
  const completedInterview = interviews.find((interview) => Boolean(interview.completedAt));
  const hasInterviewInvite = interviews.some((interview) => Boolean(interview.invitedOn));
  const hasRecording = interviews.some((interview) => Boolean(interview.recordingUrl));
  const acceptDecision = decisions.find((item) => item.decision === 'ACCEPT');
  const withdrawalDecision = decisions.find((item) => item.isOfferWithdrawal);
  const agreementSigned = application.agreementSignedAt !== 'N/A';

  let interviewStatus = 'No interview invitation recorded';
  if (completedInterview && hasRecording) {
    interviewStatus = 'Interview completed with recording';
  } else if (completedInterview && !hasRecording) {
    interviewStatus = 'Interview completed without recording';
  } else if (hasInterviewInvite) {
    interviewStatus = 'Interview invited';
  }

  let offerStatus = 'Not made';
  if (withdrawalDecision) {
    offerStatus = 'Withdrawn';
  } else if (acceptDecision) {
    offerStatus = 'Made';
  }

  let agreementStatus = 'Not applicable';
  if (withdrawalDecision) {
    agreementStatus = 'Withdrawn before signature';
  } else if (agreementSigned) {
    agreementStatus = 'Signed';
  } else if (acceptDecision || application.currentStage === 'AGREEMENT') {
    agreementStatus = 'Pending signature';
  }

  return (
    <View style={styles.section} break>
      <Text style={styles.sectionTitle}>Application Journey</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Application submitted</Text>
          <Text style={styles.value}>{application.createdAt} UTC</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Current stage</Text>
          <Text style={styles.value}>{application.currentStage}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Interview stage</Text>
          <Text style={styles.value}>{interviewStatus}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Offer status</Text>
          <Text style={styles.value}>{offerStatus}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Agreement status</Text>
          <Text style={styles.value}>{agreementStatus}</Text>
        </View>

        {acceptDecision && (
          <View style={styles.row}>
            <Text style={styles.label}>Offer decision time</Text>
            <Text style={styles.value}>{acceptDecision.decidedAt}</Text>
          </View>
        )}

        {agreementSigned && (
          <View style={styles.row}>
            <Text style={styles.label}>Agreement signed on</Text>
            <Text style={styles.value}>{application.agreementSignedAt}</Text>
          </View>
        )}

        {withdrawalDecision && (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Offer withdrawn on</Text>
              <Text style={styles.value}>{withdrawalDecision.decidedAt}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Withdrawal reason</Text>
              <Text style={styles.value}>{withdrawalDecision.reason || pdfLabels.common.notProvided}</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

/**
 * Interviews Section
 */
function InterviewsSection({
  interviews,
}: {
  interviews: SanitizedApplicationData['interviews'];
}) {
  if (!pdfSections.candidateReport.showInterviews) return null;

  return (
    <View style={styles.section} break>
      <Text style={styles.sectionTitle}>{pdfLabels.interviews.sectionTitle}</Text>

      {interviews.length > 0 ? (
        interviews.map((interview, index) => (
          <View key={index} style={[styles.card, index % 2 === 1 ? styles.cardAlt : {}]}>
            <View style={styles.row}>
              <Text style={styles.label}>{pdfLabels.interviews.interviewer}</Text>
              <Text style={styles.value}>{interview.interviewer}</Text>
            </View>

            {interview.recordingUrl ? (
              <View style={styles.row}>
                <Text style={styles.label}>{pdfLabels.interviews.recording}</Text>
                <Link src={interview.recordingUrl} style={[styles.value, styles.valueLink]}>
                  {interview.recordingUrl}
                </Link>
              </View>
            ) : (
              <View style={styles.row}>
                <Text style={styles.label}>{pdfLabels.interviews.recording}</Text>
                <Text style={styles.value}>Not recorded</Text>
              </View>
            )}

            {interview.invitedOn && (
              <View style={styles.row}>
                <Text style={styles.label}>Invited on</Text>
                <Text style={styles.value}>{interview.invitedOn}</Text>
              </View>
            )}

            {interview.completedAt && (
              <View style={styles.row}>
                <Text style={styles.label}>{pdfLabels.interviews.completedOn}</Text>
                <Text style={styles.value}>{interview.completedAt}</Text>
              </View>
            )}

            <View style={styles.row}>
              <Text style={styles.label}>{pdfLabels.interviews.outcome}</Text>
              <Text style={styles.value}>{interview.completedAt ? 'Conducted' : 'Not conducted'}</Text>
            </View>

            {interview.notes && (
              <>
                <Text style={[styles.label, { marginTop: 10 }]}>{pdfLabels.interviews.notes}</Text>
                <View style={styles.textBlock}>
                  <Text>{interview.notes}</Text>
                </View>
              </>
            )}
          </View>
        ))
      ) : (
        <Text style={styles.emptyMessage}>{pdfLabels.interviews.noInterviews}</Text>
      )}
    </View>
  );
}

/**
 * Decisions Section
 */
function DecisionsSection({ decisions }: { decisions: SanitizedApplicationData['decisions'] }) {
  if (!pdfSections.candidateReport.showDecisions) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{pdfLabels.decisions.sectionTitle}</Text>

      {decisions.length > 0 ? (
        decisions.map((decision, index) => (
          <View key={index} style={[styles.card, index % 2 === 1 ? styles.cardAlt : {}]}>
            <View style={styles.row}>
              <Text style={styles.label}>{pdfLabels.decisions.decision}</Text>
              <View
                style={[
                  styles.badge,
                  decision.decision === 'ACCEPT' ? styles.badgeSuccess : styles.badgeDanger,
                ]}
              >
                <Text>
                  {decision.decision === 'ACCEPT'
                    ? pdfLabels.decisions.accepted
                    : pdfLabels.decisions.rejected}
                </Text>
              </View>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>{pdfLabels.decisions.decidedBy}</Text>
              <Text style={styles.value}>{decision.decidedBy}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>{pdfLabels.decisions.decidedOn}</Text>
              <Text style={styles.value}>{decision.decidedAt}</Text>
            </View>

            <Text style={[styles.label, { marginTop: 10 }]}>{pdfLabels.decisions.reason}</Text>
            <View style={styles.textBlock}>
              <Text>{decision.reason || pdfLabels.common.notProvided}</Text>
            </View>

            {decision.notes && (
              <>
                <Text style={[styles.label, { marginTop: 10 }]}>{pdfLabels.decisions.notes}</Text>
                <View style={styles.textBlock}>
                  <Text>{decision.notes}</Text>
                </View>
              </>
            )}
          </View>
        ))
      ) : (
        <Text style={styles.emptyMessage}>{pdfLabels.decisions.noDecisions}</Text>
      )}
    </View>
  );
}

/**
 * Activity Log Section (Timeline)
 */
function ActivityLogSection({ auditLogs }: { auditLogs: SanitizedAuditLog[] }) {
  if (!pdfSections.candidateReport.showActivityLog) return null;

  return (
    <View style={styles.section} break>
      <Text style={styles.sectionTitle}>{pdfLabels.activity.sectionTitle}</Text>

      {auditLogs.length > 0 ? (
        auditLogs.map((log, index) => (
          <View key={index} style={styles.timelineItem}>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineDate}>{log.createdAt}</Text>
              <Text style={styles.timelineAction}>{log.action}</Text>
              <Text style={styles.timelineActor}>{log.user || pdfLabels.common.system}</Text>
            </View>
          </View>
        ))
      ) : (
        <Text style={styles.emptyMessage}>{pdfLabels.activity.noActivity}</Text>
      )}
    </View>
  );
}

/**
 * Footer Component
 */
function Footer({ generatedAt }: { generatedAt: string }) {
  if (!pdfSections.candidateReport.showFooter) return null;

  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>{pdfLabels.report.generatedOn} {generatedAt}</Text>
      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

/**
 * Main Candidate Report Document Component
 *
 * @param props - Component props containing sanitized data
 * @returns React PDF Document component
 */
export function CandidateReportDocument({
  data,
  auditLogs,
  confidential = true,
}: CandidateReportProps) {
  return (
    <Document
      title={`Candidate Report - ${data.person.fullName}`}
      author={branding.organisationName}
      subject={`Application for ${data.application.position}`}
      creator="Alterna Talent Management System"
      producer="@react-pdf/renderer"
    >
      <Page size={pdfPageConfig.size} style={styles.page}>
        <FixedPageHeader
          confidential={confidential}
          styles={{
            container: styles.pageHeader,
            logo: styles.logo,
            confidentialBlock: styles.pageConfidentialBlock,
            confidentialTitle: styles.pageConfidentialTitle,
            confidentialCopy: styles.pageConfidentialCopy,
            metaBlock: styles.pageMetaBlock,
            metaPrimary: styles.pageMetaName,
            metaSecondary: styles.pageMetaPosition,
          }}
          metaPrimary={data.person.fullName}
          metaSecondary={data.application.position}
          metaFromSecondPage
        />
        <Header />

        <PersonalInfoSection person={data.person} />
        <ApplicationDetailsSection application={data.application} />
        <AcademicBackgroundSection content={data.application.academicBackground} />
        <PreviousExperienceSection content={data.application.previousExperience} />
        <JourneySection
          application={data.application}
          interviews={data.interviews}
          decisions={data.decisions}
        />
        <AssessmentsSection assessments={data.assessments} person={data.person} />
        <InterviewsSection interviews={data.interviews} />
        <DecisionsSection decisions={data.decisions} />
        <ActivityLogSection auditLogs={auditLogs} />

        <Footer generatedAt={data.generatedAt} />
      </Page>
    </Document>
  );
}

export default CandidateReportDocument;
