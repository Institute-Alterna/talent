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
import { FixedPageHeader } from './fixed-page-header';
import type { SanitizedAuditLog } from './sanitize';
import { branding } from '@/config/branding';

/**
 * StyleSheet for PDF document
 */
const styles = StyleSheet.create({
  // Page styles
  page: {
    paddingTop: pdfSpacing.pageMargin.top + 26,
    paddingLeft: pdfSpacing.pageMargin.left,
    paddingRight: pdfSpacing.pageMargin.right,
    paddingBottom: pdfSpacing.pageMargin.bottom + 20,
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
    width: 118,
    height: 26,
  },
  pageConfidentialBlock: {
    maxWidth: 250,
  },
  pageConfidentialTitle: {
    fontFamily: pdfFonts.heading,
    fontSize: 7,
    textAlign: 'right',
    color: pdfColors.text,
    marginBottom: 1,
  },
  pageConfidentialCopy: {
    fontSize: 6,
    lineHeight: 1.3,
    textAlign: 'right',
    color: pdfColors.textMuted,
  },

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
    width: 130,
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
    fontSize: 13,
    color: pdfColors.text,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.border,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
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
  timelineMeta: {
    fontSize: 8,
    color: pdfColors.textMuted,
    marginTop: 2,
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
      <Text style={styles.headerTitle}>{pdfLabels.report.auditReport}</Text>
      <Text>{subjectLabel} {subject}</Text>
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
          <Text style={styles.summaryLabel}>Date range</Text>
          <Text style={styles.summaryValue}>
            {dateRangeStart} - {dateRangeEnd}
          </Text>
        </View>
      )}

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Total events</Text>
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
        auditLogs.map((log, index) => {
          const metaParts = [log.user || pdfLabels.common.system];

          if (pdfSections.auditReport.showIpAddresses && log.ipAddress) {
            metaParts.push(`${pdfLabels.activity.ipAddress}: ${log.ipAddress}`);
          }

          if (pdfSections.auditReport.showUserAgents && log.userAgent) {
            metaParts.push(log.userAgent);
          }

          return (
            <View key={index} style={styles.timelineItem}>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineDate}>{log.createdAt}</Text>
                <Text style={styles.timelineAction}>{log.action}</Text>
                <Text style={styles.timelineMeta}>{metaParts.join(' | ')}</Text>
              </View>
            </View>
          );
        })
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
  if (!pdfSections.auditReport.showFooter) return null;

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
        <FixedPageHeader
          confidential={confidential}
          styles={{
            container: styles.pageHeader,
            logo: styles.logo,
            confidentialBlock: styles.pageConfidentialBlock,
            confidentialTitle: styles.pageConfidentialTitle,
            confidentialCopy: styles.pageConfidentialCopy,
          }}
          hideConfidentialOnFirstPage
        />
        <Header subject={subject} subjectType={subjectType} />
        <SummarySection
          auditLogs={auditLogs}
          dateRangeStart={dateRangeStart}
          dateRangeEnd={dateRangeEnd}
        />
        <AuditLogDetails auditLogs={auditLogs} />
        <Footer generatedAt={generatedAt} />
      </Page>
    </Document>
  );
}

export default AuditReportDocument;
