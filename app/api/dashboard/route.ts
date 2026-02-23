/**
 * Dashboard Metrics API Route
 *
 * GET /api/dashboard - Get dashboard metrics and overview data
 *
 * Returns:
 * - Total active applications
 * - Applications by stage
 * - Applications awaiting action
 * - Recent activity
 * - Pipeline stats
 *
 * Required: Authenticated user with app access
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAccess } from '@/lib/api-helpers';
import { db } from '@/lib/db';
import { getRecentAuditLogs } from '@/lib/audit';
import { getAttentionBreakdown } from '@/lib/services/applications';
import { sanitizeForLog } from '@/lib/security';

/**
 * GET /api/dashboard
 *
 * Get dashboard metrics and overview data.
 * Requires authenticated user (hiring manager or admin).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Next.js route handler signature
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAccess();
    if (!auth.ok) return auth.error;

    // Get date ranges
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch all metrics in parallel
    const [
      // Total active applications
      totalActiveApplications,
      // Total persons
      totalPersons,
      // Applications by stage
      applicationsByStage,
      // Applications by status
      applicationsByStatus,
      // Applications this week
      applicationsThisWeek,
      // Attention breakdown (GC / SC / interviews / agreement) — single source of truth
      attentionBreakdown,
      // Recent audit logs
      recentActivity,
      // Top positions
      topPositions,
    ] = await Promise.all([
      db.application.count({
        where: { status: 'ACTIVE' },
      }),
      db.person.count(),
      db.application.groupBy({
        by: ['currentStage'],
        _count: true,
        where: { status: 'ACTIVE' },
      }),
      db.application.groupBy({
        by: ['status'],
        _count: true,
      }),
      db.application.count({
        where: {
          createdAt: { gte: oneWeekAgo },
        },
      }),
      // Shared attention breakdown — matches needsAttention logic in pipeline cards
      getAttentionBreakdown(),
      getRecentAuditLogs({ limit: 10, excludeActionTypes: ['VIEW'] }),
      // Top positions by application count
      db.application.groupBy({
        by: ['position'],
        _count: true,
        where: { status: 'ACTIVE' },
        orderBy: {
          _count: {
            position: 'desc',
          },
        },
        take: 5,
      }),
    ]);

    // Format applications by stage
    const stageOrder = [
      'APPLICATION',
      'GENERAL_COMPETENCIES',
      'SPECIALIZED_COMPETENCIES',
      'INTERVIEW',
      'AGREEMENT',
      'SIGNED',
    ];

    const byStage: Record<string, number> = {};
    for (const stage of stageOrder) {
      byStage[stage] = 0;
    }
    for (const item of applicationsByStage) {
      byStage[item.currentStage] = item._count;
    }

    // Format applications by status
    const byStatus: Record<string, number> = {
      ACTIVE: 0,
      ACCEPTED: 0,
      REJECTED: 0,

    };
    for (const item of applicationsByStatus) {
      byStatus[item.status] = item._count;
    }

    // Calculate awaiting action total
    const awaitingAction = attentionBreakdown.total;

    // Format top positions
    const positions = topPositions.map(item => ({
      position: item.position,
      count: item._count,
    }));

    // Format recent activity for safe output
    const activity = recentActivity.map(log => ({
      id: log.id,
      action: log.action,
      actionType: log.actionType,
      createdAt: log.createdAt,
      person: log.person ? {
        id: log.person.id,
        firstName: log.person.firstName,
        lastName: log.person.lastName,
        email: log.person.email,
      } : null,
      application: log.application ? {
        id: log.application.id,
        position: log.application.position,
      } : null,
      user: log.user ? {
        id: log.user.id,
        displayName: log.user.displayName,
      } : null,
    }));

    return NextResponse.json({
      metrics: {
        totalActiveApplications,
        totalPersons,
        applicationsThisWeek,
        pendingInterviews: attentionBreakdown.pendingInterviews,
        awaitingAction,
        breakdown: {
          awaitingGC: attentionBreakdown.awaitingGC,
          awaitingSC: attentionBreakdown.awaitingSC,
          pendingInterviews: attentionBreakdown.pendingInterviews,
          pendingAgreement: attentionBreakdown.pendingAgreement,
        },
      },
      byStage,
      byStatus,
      positions,
      recentActivity: activity,
      generatedAt: new Date().toISOString(),
    }, {
      headers: {
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', sanitizeForLog(error instanceof Error ? error.message : 'Unknown error'));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
