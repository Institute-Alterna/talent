/**
 * Audit Logging Service
 *
 * Provides comprehensive activity logging for compliance and debugging.
 * Logs all significant actions including:
 * - Database writes (create, update, delete)
 * - Email sends
 * - Status/stage transitions
 * - Webhook receipts
 * - User logins
 */

import { db } from '@/lib/db';
import { ActionType, Prisma } from '@/lib/generated/prisma/client';

/**
 * Options for creating an audit log entry
 */
export interface AuditLogOptions {
  /** Reference to the person (if applicable) */
  personId?: string;
  /** Reference to the application (if applicable) */
  applicationId?: string;
  /** Reference to the user who performed the action */
  userId?: string;
  /** Human-readable action description */
  action: string;
  /** Type of action for filtering */
  actionType: ActionType;
  /** Additional details (stored as JSON) */
  details?: Record<string, unknown>;
  /** Client IP address */
  ipAddress?: string | null;
  /** User agent string */
  userAgent?: string | null;
}

/**
 * Create an audit log entry
 *
 * @param options - Audit log options
 * @returns Created audit log entry
 */
export async function createAuditLog(options: AuditLogOptions) {
  const log = await db.auditLog.create({
    data: {
      personId: options.personId,
      applicationId: options.applicationId,
      userId: options.userId,
      action: options.action,
      actionType: options.actionType,
      details: options.details as Prisma.InputJsonValue | undefined,
      ipAddress: options.ipAddress ?? undefined,
      userAgent: options.userAgent ?? undefined,
    },
  });

  return log;
}

/**
 * Log a person creation event
 */
export async function logPersonCreated(
  personId: string,
  details?: Record<string, unknown>,
  ipAddress?: string | null
) {
  return createAuditLog({
    personId,
    action: 'Person record created',
    actionType: 'CREATE',
    details,
    ipAddress,
  });
}

/**
 * Log a person update event
 */
export async function logPersonUpdated(
  personId: string,
  changes: Record<string, unknown>,
  userId?: string,
  ipAddress?: string | null
) {
  return createAuditLog({
    personId,
    userId,
    action: 'Person record updated',
    actionType: 'UPDATE',
    details: { changes },
    ipAddress,
  });
}

/**
 * Log an application creation event
 */
export async function logApplicationCreated(
  applicationId: string,
  personId: string,
  position: string,
  details?: Record<string, unknown>,
  ipAddress?: string | null
) {
  return createAuditLog({
    applicationId,
    personId,
    action: `Application submitted for ${position}`,
    actionType: 'CREATE',
    details: { position, ...details },
    ipAddress,
  });
}

/**
 * Log an application stage change
 */
export async function logStageChange(
  applicationId: string,
  personId: string,
  fromStage: string,
  toStage: string,
  userId?: string,
  reason?: string
) {
  return createAuditLog({
    applicationId,
    personId,
    userId,
    action: `Stage changed from ${fromStage} to ${toStage}`,
    actionType: 'STAGE_CHANGE',
    details: { fromStage, toStage, reason },
  });
}

/**
 * Log an application status change
 */
export async function logStatusChange(
  applicationId: string,
  personId: string,
  fromStatus: string,
  toStatus: string,
  userId?: string,
  reason?: string
) {
  return createAuditLog({
    applicationId,
    personId,
    userId,
    action: `Status changed from ${fromStatus} to ${toStatus}`,
    actionType: 'STATUS_CHANGE',
    details: { fromStatus, toStatus, reason },
  });
}

/**
 * Log an assessment completion
 */
export async function logAssessmentCompleted(
  personId: string,
  applicationId: string | null,
  assessmentType: string,
  score: number,
  passed: boolean
) {
  return createAuditLog({
    personId,
    applicationId: applicationId ?? undefined,
    action: `${assessmentType} assessment completed`,
    actionType: 'UPDATE',
    details: { assessmentType, score, passed },
  });
}

/**
 * Log an email send event
 */
export async function logEmailSent(
  personId: string,
  applicationId: string | null,
  templateName: string,
  recipientEmail: string,
  userId?: string
) {
  return createAuditLog({
    personId,
    applicationId: applicationId ?? undefined,
    userId,
    action: `Email sent: ${templateName}`,
    actionType: 'EMAIL_SENT',
    details: { templateName, recipientEmail },
  });
}

/**
 * Log an interview scheduling event
 */
export async function logInterviewScheduled(
  applicationId: string,
  personId: string,
  interviewerId: string,
  schedulingLink: string,
  userId?: string
) {
  return createAuditLog({
    applicationId,
    personId,
    userId,
    action: 'Interview scheduled',
    actionType: 'CREATE',
    details: { interviewerId, schedulingLink },
  });
}

/**
 * Log a decision event
 */
export async function logDecisionMade(
  applicationId: string,
  personId: string,
  decision: string,
  reason: string,
  userId: string
) {
  return createAuditLog({
    applicationId,
    personId,
    userId,
    action: `Decision made: ${decision}`,
    actionType: 'UPDATE',
    details: { decision, reason },
  });
}

/**
 * Log a webhook receipt
 */
export async function logWebhookReceived(
  webhookType: string,
  personId?: string,
  applicationId?: string,
  details?: Record<string, unknown>,
  ipAddress?: string | null
) {
  return createAuditLog({
    personId,
    applicationId,
    action: `Webhook received: ${webhookType}`,
    actionType: 'CREATE',
    details: { webhookType, ...details },
    ipAddress,
  });
}

/**
 * Log a view event (for GDPR compliance)
 */
export async function logRecordViewed(
  personId: string,
  applicationId: string | null,
  userId: string,
  viewType: string
) {
  return createAuditLog({
    personId,
    applicationId: applicationId ?? undefined,
    userId,
    action: `Record viewed: ${viewType}`,
    actionType: 'VIEW',
    details: { viewType },
  });
}

/**
 * Log a deletion event
 */
export async function logRecordDeleted(
  entityType: string,
  entityId: string,
  personId?: string,
  applicationId?: string,
  userId?: string,
  reason?: string
) {
  return createAuditLog({
    personId,
    applicationId,
    userId,
    action: `${entityType} deleted`,
    actionType: 'DELETE',
    details: { entityType, entityId, reason },
  });
}

/**
 * Get audit logs for a person
 */
export async function getAuditLogsForPerson(
  personId: string,
  options?: { limit?: number; offset?: number }
) {
  return db.auditLog.findMany({
    where: { personId },
    orderBy: { createdAt: 'desc' },
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Get audit logs for an application
 */
export async function getAuditLogsForApplication(
  applicationId: string,
  options?: { limit?: number; offset?: number }
) {
  return db.auditLog.findMany({
    where: { applicationId },
    orderBy: { createdAt: 'desc' },
    take: options?.limit ?? 50,
    skip: options?.offset ?? 0,
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Get recent audit logs (for dashboard)
 */
export async function getRecentAuditLogs(limit: number = 20) {
  return db.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      person: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      application: {
        select: {
          id: true,
          position: true,
        },
      },
      user: {
        select: {
          id: true,
          displayName: true,
        },
      },
    },
  });
}

/**
 * Get audit log statistics
 */
export async function getAuditLogStats() {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [total, last24Hours, last7Days, byType] = await Promise.all([
    db.auditLog.count(),
    db.auditLog.count({
      where: { createdAt: { gte: oneDayAgo } },
    }),
    db.auditLog.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    }),
    db.auditLog.groupBy({
      by: ['actionType'],
      _count: true,
    }),
  ]);

  const actionTypeCounts: Record<string, number> = {};
  for (const item of byType) {
    actionTypeCounts[item.actionType] = item._count;
  }

  return {
    total,
    last24Hours,
    last7Days,
    byActionType: actionTypeCounts,
  };
}
