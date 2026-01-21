/**
 * Audit Report PDF Component
 *
 * React PDF component for generating standalone audit log reports.
 * Uses @react-pdf/renderer for PDF generation.
 *
 * SECURITY: All data must be sanitized before passing to this component.
 * Use the sanitization functions from ./sanitize.ts
 */

import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import {
  pdfColors,
  pdfFonts,
  pdfFontSizes,
  pdfSpacing,
  pdfPageConfig,
  pdfLabels,
  pdfSections,
} from './config';
import type { SanitizedAuditLog } from './sanitize';
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
    paddingBottom: pdfSpacing.pageMargin.bottom + 20,
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

  // Summary section
  summary: {
    marginBottom: pdfSpacing.sectionGap,
    padding: 15,
    backgroundColor: pdfColors.backgroundAlt,
    borderRadius: 4,
  },
  summaryTitle: {
    fontFamily: pdfFonts.heading,
    fontSize: pdfFontSizes.subsectionHeader,
    color: pdfColors.primary,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  summaryLabel: {
    width: 180,
    fontFamily: pdfFonts.heading,
    fontSize: pdfFontSizes.body,
    color: pdfColors.textMuted,
  },
  summaryValue: {
    flex: 1,
    fontSize: pdfFontSizes.body,
    color: pdfColors.text,
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 10,
  },
  statBox: {
    width: '22%',
    padding: 10,
    backgroundColor: pdfColors.white,
    borderWidth: 1,
    borderColor: pdfColors.border,
    borderRadius: 4,
    alignItems: 'center',
  },
  statNumber: {
    fontFamily: pdfFonts.heading,
    fontSize: pdfFontSizes.sectionHeader,
    color: pdfColors.primary,
  },
  statLabel: {
    fontSize: pdfFontSizes.small,
    color: pdfColors.textMuted,
    marginTop: 2,
    textAlign: 'center',
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

  // Table styles
  table: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: pdfColors.border,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: pdfColors.primary,
  },
  tableHeaderCell: {
    fontFamily: pdfFonts.heading,
    fontSize: pdfFontSizes.small,
    color: pdfColors.white,
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: pdfColors.secondary,
  },
  tableHeaderCellLast: {
    borderRightWidth: 0,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.border,
  },
  tableRowAlt: {
    backgroundColor: pdfColors.backgroundAlt,
  },
  tableCell: {
    fontSize: pdfFontSizes.small,
    color: pdfColors.text,
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: pdfColors.border,
  },
  tableCellLast: {
    borderRightWidth: 0,
  },

  // Column widths
  colTimestamp: { width: '18%' },
  colAction: { width: '30%' },
  colType: { width: '12%' },
  colUser: { width: '15%' },
  colDetails: { width: '25%' },
  colIp: { width: '12%' },

  // Timeline styles (alternative view)
  timelineItem: {
    marginBottom: 12,
    paddingLeft: 15,
    borderLeftWidth: 2,
    borderLeftColor: pdfColors.border,
  },
  timelineContent: {
    paddingLeft: 10,
  },
  timelineDate: {
    fontFamily: pdfFonts.heading,
    fontSize: pdfFontSizes.small,
    color: pdfColors.primary,
    marginBottom: 2,
  },
  timelineAction: {
    fontSize: pdfFontSizes.body,
    color: pdfColors.text,
    marginBottom: 2,
  },
  timelineMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 2,
  },
  timelineMetaItem: {
    fontSize: pdfFontSizes.small,
    color: pdfColors.textMuted,
  },
  timelineDetails: {
    marginTop: 4,
    padding: 6,
    backgroundColor: pdfColors.backgroundAlt,
    borderRadius: 2,
    fontSize: pdfFontSizes.small,
    color: pdfColors.textMuted,
  },

  // Action type badges
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 7,
  },
  badgeCreate: { backgroundColor: '#D1FAE5', color: '#065F46' },
  badgeUpdate: { backgroundColor: '#DBEAFE', color: '#1E40AF' },
  badgeDelete: { backgroundColor: '#FEE2E2', color: '#991B1B' },
  badgeView: { backgroundColor: '#F3F4F6', color: '#374151' },
  badgeEmail: { backgroundColor: '#FEF3C7', color: '#92400E' },
  badgeStage: { backgroundColor: '#E0E7FF', color: '#3730A3' },
  badgeStatus: { backgroundColor: '#FCE7F3', color: '#9D174D' },

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

  // Empty message
  emptyMessage: {
    fontSize: pdfFontSizes.body,
    color: pdfColors.textMuted,
    fontStyle: 'italic',
    marginTop: 10,
    textAlign: 'center',
  },
});

/**
 * Props for the AuditReportDocument component
 */
export interface AuditReportProps {
  /** Subject of the audit report (candidate name, application ID, etc.) */
  subject: string;
  /** Subject type (person, application) */
  subjectType: 'person' | 'application';
  /** Sanitized audit logs */
  auditLogs: SanitizedAuditLog[];
  /** Date range start (formatted string) */
  dateRangeStart?: string;
  /** Date range end (formatted string) */
  dateRangeEnd?: string;
  /** Report generation timestamp */
  generatedAt: string;
  /** Whether to include confidential notice */
  confidential?: boolean;
}

/**
 * Calculate audit log statistics
 */
function calculateStats(auditLogs: SanitizedAuditLog[]): Record<string, number> {
  const stats: Record<string, number> = {
    total: auditLogs.length,
    create: 0,
    update: 0,
    delete: 0,
    view: 0,
    email: 0,
    stageChange: 0,
    statusChange: 0,
  };

  for (const log of auditLogs) {
    switch (log.actionType) {
      case 'CREATE':
        stats.create++;
        break;
      case 'UPDATE':
        stats.update++;
        break;
      case 'DELETE':
        stats.delete++;
        break;
      case 'VIEW':
        stats.view++;
        break;
      case 'EMAIL_SENT':
        stats.email++;
        break;
      case 'STAGE_CHANGE':
        stats.stageChange++;
        break;
      case 'STATUS_CHANGE':
        stats.statusChange++;
        break;
    }
  }

  return stats;
}

/**
 * Get badge style for action type
 */
function getActionTypeBadgeStyle(actionType: string) {
  switch (actionType) {
    case 'CREATE':
      return styles.badgeCreate;
    case 'UPDATE':
      return styles.badgeUpdate;
    case 'DELETE':
      return styles.badgeDelete;
    case 'VIEW':
      return styles.badgeView;
    case 'EMAIL_SENT':
      return styles.badgeEmail;
    case 'STAGE_CHANGE':
      return styles.badgeStage;
    case 'STATUS_CHANGE':
      return styles.badgeStatus;
    default:
      return styles.badgeView;
  }
}

/**
 * Header Component
 */
function Header({
  subject,
  subjectType,
}: {
  subject: string;
  subjectType: 'person' | 'application';
}) {
  if (!pdfSections.auditReport.showHeader) return null;

  const subjectLabel = subjectType === 'person' ? 'Person' : 'Application';

  return (
    <View style={styles.header}>
      <Text style={styles.headerOrg}>{branding.organisationName}</Text>
      <Text style={styles.headerTitle}>{pdfLabels.report.auditReport}</Text>
      <Text style={styles.headerSubtitle}>
        {subjectLabel}: {subject}
      </Text>
    </View>
  );
}

/**
 * Summary Section with Statistics
 */
function SummarySection({
  auditLogs,
  dateRangeStart,
  dateRangeEnd,
}: {
  auditLogs: SanitizedAuditLog[];
  dateRangeStart?: string;
  dateRangeEnd?: string;
}) {
  if (!pdfSections.auditReport.showSummary) return null;

  const stats = calculateStats(auditLogs);

  return (
    <View style={styles.summary}>
      <Text style={styles.summaryTitle}>Report Summary</Text>

      {dateRangeStart && dateRangeEnd && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Date Range:</Text>
          <Text style={styles.summaryValue}>
            {dateRangeStart} - {dateRangeEnd}
          </Text>
        </View>
      )}

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Total Events:</Text>
        <Text style={styles.summaryValue}>{stats.total}</Text>
      </View>

      <View style={styles.statsGrid}>
        {stats.create > 0 && (
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.create}</Text>
            <Text style={styles.statLabel}>Created</Text>
          </View>
        )}
        {stats.update > 0 && (
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.update}</Text>
            <Text style={styles.statLabel}>Updated</Text>
          </View>
        )}
        {stats.email > 0 && (
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.email}</Text>
            <Text style={styles.statLabel}>Emails Sent</Text>
          </View>
        )}
        {stats.stageChange > 0 && (
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.stageChange}</Text>
            <Text style={styles.statLabel}>Stage Changes</Text>
          </View>
        )}
        {stats.statusChange > 0 && (
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.statusChange}</Text>
            <Text style={styles.statLabel}>Status Changes</Text>
          </View>
        )}
        {stats.view > 0 && (
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{stats.view}</Text>
            <Text style={styles.statLabel}>Views</Text>
          </View>
        )}
      </View>
    </View>
  );
}

/**
 * Audit Log Details Section (Timeline View)
 */
function AuditLogDetails({ auditLogs }: { auditLogs: SanitizedAuditLog[] }) {
  if (!pdfSections.auditReport.showDetails) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{pdfLabels.activity.sectionTitle}</Text>

      {auditLogs.length > 0 ? (
        auditLogs.map((log, index) => (
          <View key={index} style={styles.timelineItem}>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineDate}>{log.createdAt}</Text>
              <Text style={styles.timelineAction}>{log.action}</Text>

              <View style={styles.timelineMeta}>
                <View style={[styles.badge, getActionTypeBadgeStyle(log.actionType)]}>
                  <Text>{log.actionType.replace('_', ' ')}</Text>
                </View>

                {log.user && (
                  <Text style={styles.timelineMetaItem}>
                    {pdfLabels.activity.user}: {log.user}
                  </Text>
                )}

                {pdfSections.auditReport.showIpAddresses && log.ipAddress && (
                  <Text style={styles.timelineMetaItem}>
                    {pdfLabels.activity.ipAddress}: {log.ipAddress}
                  </Text>
                )}
              </View>

              {log.details && (
                <View style={styles.timelineDetails}>
                  <Text>{log.details}</Text>
                </View>
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
  if (!pdfSections.auditReport.showFooter) return null;

  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>
        {pdfLabels.report.generatedOn}: {generatedAt}
        {confidential && ` | ${pdfLabels.report.confidential}`}
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
 * Main Audit Report Document Component
 *
 * @param props - Component props containing sanitized audit data
 * @returns React PDF Document component
 */
export function AuditReportDocument({
  subject,
  subjectType,
  auditLogs,
  dateRangeStart,
  dateRangeEnd,
  generatedAt,
  confidential = true,
}: AuditReportProps) {
  return (
    <Document
      title={`Audit Report - ${subject}`}
      author={branding.organisationName}
      subject="Activity Audit Report"
      creator="Alterna Talent Management System"
      producer="@react-pdf/renderer"
    >
      <Page size={pdfPageConfig.size} style={styles.page}>
        <Header subject={subject} subjectType={subjectType} />
        <SummarySection
          auditLogs={auditLogs}
          dateRangeStart={dateRangeStart}
          dateRangeEnd={dateRangeEnd}
        />
        <AuditLogDetails auditLogs={auditLogs} />
        <Footer confidential={confidential} generatedAt={generatedAt} />
      </Page>
    </Document>
  );
}

export default AuditReportDocument;
