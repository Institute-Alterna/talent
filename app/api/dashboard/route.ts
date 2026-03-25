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

    // Fetch all metrics in parallel — allSettled so a single slow/failing query
    // never takes down the entire dashboard response.
    const settled = await Promise.allSettled([
      db.application.count({ where: { status: 'ACTIVE' } }),
      db.person.count(),
      db.application.groupBy({ by: ['currentStage'], _count: true, where: { status: 'ACTIVE' } }),
      db.application.groupBy({ by: ['status'], _count: true }),
      db.application.count({ where: { createdAt: { gte: oneWeekAgo } } }),
      getAttentionBreakdown(),
      getRecentAuditLogs({ limit: 10, excludeActionTypes: ['VIEW'] }),
      db.application.groupBy({
        by: ['position'],
        _count: true,
        where: { status: 'ACTIVE' },
        orderBy: { _count: { position: 'desc' } },
        take: 5,
      }),
    ]);

    // Log any failed queries without letting them crash the response
    settled.forEach((result, i) => {
      if (result.status === 'rejected') {
        console.error(`[Dashboard] Query ${i} failed:`, sanitizeForLog(result.reason instanceof Error ? result.reason.message : String(result.reason)));
      }
    });

    function unwrap<T>(result: PromiseSettledResult<T>, fallback: T): T {
      return result.status === 'fulfilled' ? result.value : fallback;
    }

    const totalActiveApplications = unwrap(settled[0] as PromiseSettledResult<number>, 0);
    const totalPersons            = unwrap(settled[1] as PromiseSettledResult<number>, 0);
    const applicationsByStage     = unwrap(settled[2] as PromiseSettledResult<{ currentStage: string; _count: number }[]>, []);
    const applicationsByStatus    = unwrap(settled[3] as PromiseSettledResult<{ status: string; _count: number }[]>, []);
    const applicationsThisWeek    = unwrap(settled[4] as PromiseSettledResult<number>, 0);
    const attentionBreakdown      = unwrap(
      settled[5] as PromiseSettledResult<Awaited<ReturnType<typeof getAttentionBreakdown>>>,
      { total: 0, awaitingGC: 0, gcFailedPendingRejection: 0, awaitingSC: 0, pendingInterviews: 0, pendingAgreement: 0 }
    );
    const recentActivity          = unwrap(settled[6] as PromiseSettledResult<Awaited<ReturnType<typeof getRecentAuditLogs>>>, []);
    const topPositions            = unwrap(settled[7] as PromiseSettledResult<{ position: string; _count: number }[]>, []);

    // Format applications by stage (fold legacy APPLICATION into GENERAL_COMPETENCIES)
    const stageOrder = [
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
      if (item.currentStage === 'APPLICATION') {
        byStage['GENERAL_COMPETENCIES'] = (byStage['GENERAL_COMPETENCIES'] || 0) + item._count;
      } else {
        byStage[item.currentStage] = item._count;
      }
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
