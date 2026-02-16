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
import type { SanitizedApplicationData, SanitizedAuditLog } from './sanitize';
import { branding } from '@/config/branding';

/**
 * StyleSheet for PDF document
 */
const styles = StyleSheet.create({
  // Page styles
  page: {
    padding: pdfSpacing.pageMargin.top,
    paddingLeft: pdfSpacing.pageMargin.left,
    paddingRight: pdfSpacing.pageMargin.right,
    paddingBottom: pdfSpacing.pageMargin.bottom + 20, // Extra space for footer
    fontFamily: pdfFonts.body,
    fontSize: pdfFontSizes.body,
    color: pdfColors.text,
    backgroundColor: pdfColors.white,
  },

  // Header styles
  header: {
    marginBottom: pdfSpacing.sectionGap,
    borderBottomWidth: 2,
    borderBottomColor: pdfColors.primary,
    paddingBottom: 10,
  },
  headerTitle: {
    fontFamily: pdfFonts.heading,
    fontSize: pdfFontSizes.title,
    color: pdfColors.primary,
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: pdfFontSizes.small,
    color: pdfColors.textMuted,
  },
  headerOrg: {
    fontFamily: pdfFonts.heading,
    fontSize: pdfFontSizes.subsectionHeader,
    color: pdfColors.secondary,
    marginBottom: 3,
  },

  // Section styles
  section: {
    marginBottom: pdfSpacing.sectionGap,
  },
  sectionTitle: {
    fontFamily: pdfFonts.heading,
    fontSize: pdfFontSizes.sectionHeader,
    color: pdfColors.primary,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.border,
  },
  subsectionTitle: {
    fontFamily: pdfFonts.heading,
    fontSize: pdfFontSizes.subsectionHeader,
    color: pdfColors.secondary,
    marginBottom: 5,
    marginTop: 10,
  },

  // Row styles for key-value pairs
  row: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  label: {
    width: 150,
    fontFamily: pdfFonts.heading,
    fontSize: pdfFontSizes.body,
    color: pdfColors.textMuted,
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
    padding: 10,
    borderWidth: 1,
    borderColor: pdfColors.border,
    borderRadius: 4,
    backgroundColor: pdfColors.white,
  },
  cardAlt: {
    backgroundColor: pdfColors.backgroundAlt,
  },

  // Timeline styles
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingLeft: 15,
    borderLeftWidth: 2,
    borderLeftColor: pdfColors.border,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 10,
  },
  timelineDate: {
    fontSize: pdfFontSizes.small,
    color: pdfColors.textMuted,
    marginBottom: 2,
  },
  timelineAction: {
    fontSize: pdfFontSizes.body,
    color: pdfColors.text,
    marginBottom: 2,
  },
  timelineDetails: {
    fontSize: pdfFontSizes.small,
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
function Header({ candidateName, position }: { candidateName: string; position: string }) {
  if (!pdfSections.candidateReport.showHeader) return null;

  return (
    <View style={styles.header}>
      <Text style={styles.headerOrg}>{branding.organisationName}</Text>
      <Text style={styles.headerTitle}>{pdfLabels.report.candidateReport}</Text>
      <Text style={styles.headerSubtitle}>
        {candidateName} - {position}
      </Text>
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
      <Text style={styles.sectionTitle}>{pdfLabels.person.sectionTitle}</Text>

      <View style={styles.row}>
        <Text style={styles.label}>{pdfLabels.person.name}:</Text>
        <Text style={styles.value}>{person.fullName || pdfLabels.common.notProvided}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{pdfLabels.person.email}:</Text>
        <Text style={styles.value}>{person.email || pdfLabels.common.notProvided}</Text>
      </View>

      {person.secondaryEmail && (
        <View style={styles.row}>
          <Text style={styles.label}>{pdfLabels.person.secondaryEmail}:</Text>
          <Text style={styles.value}>{person.secondaryEmail}</Text>
        </View>
      )}

      <View style={styles.row}>
        <Text style={styles.label}>{pdfLabels.person.phone}:</Text>
        <Text style={styles.value}>{person.phoneNumber || pdfLabels.common.notProvided}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{pdfLabels.person.location}:</Text>
        <Text style={styles.value}>{person.location || pdfLabels.common.notProvided}</Text>
      </View>

      {person.portfolioLink && (
        <View style={styles.row}>
          <Text style={styles.label}>{pdfLabels.person.portfolio}:</Text>
          <Link src={person.portfolioLink} style={[styles.value, styles.valueLink]}>
            {person.portfolioLink}
          </Link>
        </View>
      )}

      <View style={styles.row}>
        <Text style={styles.label}>{pdfLabels.person.education}:</Text>
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
        <Text style={styles.label}>{pdfLabels.application.applicationId}:</Text>
        <Text style={styles.value}>{application.id}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{pdfLabels.application.position}:</Text>
        <Text style={styles.value}>{application.position}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{pdfLabels.application.stage}:</Text>
        <View style={[styles.badge, styles.badgePrimary]}>
          <Text>{stageLabel}</Text>
        </View>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{pdfLabels.application.status}:</Text>
        <StatusBadge status={application.status} />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{pdfLabels.application.appliedOn}:</Text>
        <Text style={styles.value}>{application.createdAt}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>{pdfLabels.application.lastUpdated}:</Text>
        <Text style={styles.value}>{application.updatedAt}</Text>
      </View>

      {/* Links */}
      {application.resumeUrl && (
        <View style={styles.row}>
          <Text style={styles.label}>{pdfLabels.application.resume}:</Text>
          <Link src={application.resumeUrl} style={[styles.value, styles.valueLink]}>
            {pdfLabels.application.viewLink}
          </Link>
        </View>
      )}

      {application.videoLink && (
        <View style={styles.row}>
          <Text style={styles.label}>{pdfLabels.application.video}:</Text>
          <Link src={application.videoLink} style={[styles.value, styles.valueLink]}>
            {pdfLabels.application.viewLink}
          </Link>
        </View>
      )}

      {application.otherFileUrl && (
        <View style={styles.row}>
          <Text style={styles.label}>{pdfLabels.application.otherFiles}:</Text>
          <Link src={application.otherFileUrl} style={[styles.value, styles.valueLink]}>
            {pdfLabels.application.viewLink}
          </Link>
        </View>
      )}

      {/* Missing fields warning */}
      {application.missingFields.length > 0 && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            {pdfLabels.application.missingFieldsWarning}: {application.missingFields.join(', ')}
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
              <Text style={styles.label}>{pdfLabels.assessments.score}:</Text>
              <Text style={styles.value}>{person.generalCompetenciesScore}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{pdfLabels.assessments.completedOn}:</Text>
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
              <Text style={styles.label}>{pdfLabels.assessments.score}:</Text>
              <Text style={styles.value}>{assessment.score}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{pdfLabels.assessments.threshold}:</Text>
              <Text style={styles.value}>{assessment.threshold}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{pdfLabels.assessments.result}:</Text>
              <View
                style={[
                  styles.badge,
                  assessment.passed === 'Yes' ? styles.badgeSuccess : styles.badgeDanger,
                ]}
              >
                <Text>
                  {assessment.passed === 'Yes'
                    ? pdfLabels.assessments.passed
                    : pdfLabels.assessments.failed}
                </Text>
              </View>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{pdfLabels.assessments.completedOn}:</Text>
              <Text style={styles.value}>{assessment.completedAt}</Text>
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
 * Interviews Section
 */
function InterviewsSection({
  interviews,
}: {
  interviews: SanitizedApplicationData['interviews'];
}) {
  if (!pdfSections.candidateReport.showInterviews) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{pdfLabels.interviews.sectionTitle}</Text>

      {interviews.length > 0 ? (
        interviews.map((interview, index) => (
          <View key={index} style={[styles.card, index % 2 === 1 ? styles.cardAlt : {}]}>
            <View style={styles.row}>
              <Text style={styles.label}>{pdfLabels.interviews.interviewer}:</Text>
              <Text style={styles.value}>{interview.interviewer}</Text>
            </View>

            {interview.schedulingLink && (
              <View style={styles.row}>
                <Text style={styles.label}>{pdfLabels.interviews.schedulingLink}:</Text>
                <Link src={interview.schedulingLink} style={[styles.value, styles.valueLink]}>
                  {interview.schedulingLink}
                </Link>
              </View>
            )}

            {interview.scheduledAt && (
              <View style={styles.row}>
                <Text style={styles.label}>{pdfLabels.interviews.scheduledFor}:</Text>
                <Text style={styles.value}>{interview.scheduledAt}</Text>
              </View>
            )}

            {interview.completedAt && (
              <View style={styles.row}>
                <Text style={styles.label}>{pdfLabels.interviews.completedOn}:</Text>
                <Text style={styles.value}>{interview.completedAt}</Text>
              </View>
            )}

            <View style={styles.row}>
              <Text style={styles.label}>{pdfLabels.interviews.outcome}:</Text>
              <InterviewOutcomeBadge outcome={interview.outcome} />
            </View>

            {interview.notes && (
              <>
                <Text style={[styles.label, { marginTop: 10 }]}>{pdfLabels.interviews.notes}:</Text>
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
 * Get badge style based on interview outcome
 */
function getOutcomeBadgeStyle(outcome: string) {
  if (outcome === 'ACCEPT') return styles.badgeSuccess;
  if (outcome === 'REJECT') return styles.badgeDanger;
  return styles.badgeWarning;
}

/**
 * Get label for interview outcome
 */
function getOutcomeLabel(outcome: string): string {
  if (outcome === 'ACCEPT') return pdfLabels.interviews.accept;
  if (outcome === 'REJECT') return pdfLabels.interviews.reject;
  return pdfLabels.interviews.pending;
}

/**
 * Interview Outcome Badge Component
 */
function InterviewOutcomeBadge({ outcome }: { outcome: string }) {
  return (
    <View style={[styles.badge, getOutcomeBadgeStyle(outcome)]}>
      <Text>{getOutcomeLabel(outcome)}</Text>
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
              <Text style={styles.label}>{pdfLabels.decisions.decision}:</Text>
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
              <Text style={styles.label}>{pdfLabels.decisions.decidedBy}:</Text>
              <Text style={styles.value}>{decision.decidedBy}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>{pdfLabels.decisions.decidedOn}:</Text>
              <Text style={styles.value}>{decision.decidedAt}</Text>
            </View>

            <Text style={[styles.label, { marginTop: 10 }]}>{pdfLabels.decisions.reason}:</Text>
            <View style={styles.textBlock}>
              <Text>{decision.reason || pdfLabels.common.notProvided}</Text>
            </View>

            {decision.notes && (
              <>
                <Text style={[styles.label, { marginTop: 10 }]}>{pdfLabels.decisions.notes}:</Text>
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
              {log.user && (
                <Text style={styles.timelineDetails}>
                  {pdfLabels.activity.user}: {log.user}
                </Text>
              )}
              {log.details && (
                <Text style={styles.timelineDetails}>
                  {pdfLabels.activity.details}: {log.details}
                </Text>
              )}
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
function Footer({ confidential, generatedAt }: { confidential: boolean; generatedAt: string }) {
  if (!pdfSections.candidateReport.showFooter) return null;

  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        {pdfLabels.report.generatedOn}: {generatedAt}
        {confidential && ` | ${pdfLabels.report.confidential} \n${pdfLabels.report.internalUseOnly}`}
      </Text>
      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) =>
          `${pdfLabels.report.page} ${pageNumber} ${pdfLabels.report.of} ${totalPages}`
        }
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
        <Header candidateName={data.person.fullName} position={data.application.position} />

        <PersonalInfoSection person={data.person} />
        <ApplicationDetailsSection application={data.application} />
        <AcademicBackgroundSection content={data.application.academicBackground} />
        <PreviousExperienceSection content={data.application.previousExperience} />
        <AssessmentsSection assessments={data.assessments} person={data.person} />
        <InterviewsSection interviews={data.interviews} />
        <DecisionsSection decisions={data.decisions} />
        <ActivityLogSection auditLogs={auditLogs} />

        <Footer confidential={confidential} generatedAt={data.generatedAt} />
      </Page>
    </Document>
  );
}

export default CandidateReportDocument;
