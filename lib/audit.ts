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
import { sanitizeForLog } from '@/lib/security';

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
    action: `Application submitted for ${sanitizeForLog(position)}`,
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
    action: `Stage changed from ${sanitizeForLog(fromStage)} to ${sanitizeForLog(toStage)}`,
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
    action: `Status changed from ${sanitizeForLog(fromStatus)} to ${sanitizeForLog(toStatus)}`,
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
  score: number | null,
  passed: boolean | null
) {
  return createAuditLog({
    personId,
    applicationId: applicationId ?? undefined,
    action: `${sanitizeForLog(assessmentType)} assessment completed`,
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
    action: `Email sent: ${sanitizeForLog(templateName)}`,
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
 * Log an interview rescheduling event
 */
export async function logInterviewRescheduled(
  applicationId: string,
  personId: string,
  oldInterviewerId: string,
  newInterviewerId: string,
  emailResent: boolean,
  userId?: string
) {
  const action = oldInterviewerId === newInterviewerId
    ? `Interview rescheduled${emailResent ? ' (email resent)' : ''}`
    : `Interview reassigned to new interviewer${emailResent ? ' (email sent)' : ''}`;
  
  return createAuditLog({
    applicationId,
    personId,
    userId,
    action,
    actionType: 'UPDATE',
    details: { oldInterviewerId, newInterviewerId, emailResent },
  });
}

/**
 * Log an interview completion event
 */
export async function logInterviewCompleted(
  applicationId: string,
  personId: string,
  interviewerId: string,
  userId?: string
) {
  return createAuditLog({
    applicationId,
    personId,
    userId,
    action: 'Interview marked as completed',
    actionType: 'UPDATE',
    details: { interviewerId },
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
    action: `Decision made: ${sanitizeForLog(decision)}`,
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
    action: `Webhook received: ${sanitizeForLog(webhookType)}`,
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
    action: `Record viewed: ${sanitizeForLog(viewType)}`,
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
    action: `${sanitizeForLog(entityType)} deleted`,
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
 * Options for fetching recent audit logs
 */
export interface RecentAuditLogsOptions {
  /** Maximum number of logs to return */
  limit?: number;
  /** Action types to exclude from results */
  excludeActionTypes?: ActionType[];
}

/**
 * Get recent audit logs (for dashboard)
 */
export async function getRecentAuditLogs(options: RecentAuditLogsOptions = {}) {
  const { limit = 20, excludeActionTypes = [] } = options;

  const whereClause =
    excludeActionTypes.length > 0
      ? { actionType: { notIn: excludeActionTypes } }
      : {};

  return db.auditLog.findMany({
    where: whereClause,
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
 * Options for fetching all audit logs with cursor-based pagination
 */
export interface GetAllAuditLogsOptions {
  /** Maximum number of logs to return per page */
  limit?: number;
  /** Cursor for pagination (ID of the last item from previous page) */
  cursor?: string;
  /** Filter by user ID (who performed the action) */
  actorId?: string;
  /** Search in action text */
  searchTerm?: string;
  /** Filter by action types */
  actionTypes?: ActionType[];
}

/**
 * Get all audit logs with cursor-based pagination (for admin audit log page)
 */
export async function getAllAuditLogs(options: GetAllAuditLogsOptions = {}) {
  const { limit = 30, cursor, actorId, searchTerm, actionTypes } = options;

  // Build where clause based on filters
  const whereClause: Prisma.AuditLogWhereInput = {};

  if (actorId) {
    whereClause.userId = actorId;
  }

  if (searchTerm && searchTerm.trim()) {
    // Sanitize search term to prevent injection - only allow alphanumeric and basic punctuation
    const sanitizedTerm = searchTerm.trim().slice(0, 100);
    whereClause.action = {
      contains: sanitizedTerm,
    };
  }

  if (actionTypes && actionTypes.length > 0) {
    whereClause.actionType = { in: actionTypes };
  }

  // Fetch one more than limit to determine if there are more results
  const logs = await db.auditLog.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor && {
      skip: 1,
      cursor: { id: cursor },
    }),
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
          email: true,
        },
      },
    },
  });

  const hasMore = logs.length > limit;
  const returnedLogs = hasMore ? logs.slice(0, limit) : logs;
  const nextCursor = hasMore ? returnedLogs[returnedLogs.length - 1]?.id : null;

  return {
    logs: returnedLogs,
    nextCursor,
    hasMore,
  };
}

/**
 * Get list of users who have performed actions (for filter dropdown)
 */
export async function getAuditActors() {
  const actors = await db.auditLog.findMany({
    where: {
      userId: { not: null },
    },
    select: {
      user: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
    },
    distinct: ['userId'],
  });

  // Filter out nulls and dedupe
  return actors
    .map((a) => a.user)
    .filter((user): user is NonNullable<typeof user> => user !== null);
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
