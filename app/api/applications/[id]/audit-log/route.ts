/**
 * Audit Log API Route
 *
 * GET /api/applications/[id]/audit-log
 *
 * Get the full audit trail for an application.
 * Admin only.
 *
 * Query parameters:
 * - limit: Maximum number of entries (default: 100, max: 500)
 * - offset: Pagination offset (default: 0)
 *
 * Required: Admin access
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-helpers';
import { getApplicationById } from '@/lib/services/applications';
import { getAuditLogsForApplication } from '@/lib/audit';
import { getEmailLogsForApplication } from '@/lib/email';
import { sanitizeForLog } from '@/lib/security';
import { isValidUUID } from '@/lib/utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/applications/[id]/audit-log
 *
 * Get the complete audit trail for an application.
 * Admin only.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    // Validate ID format
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid application ID format' },
        { status: 400 }
      );
    }

    const auth = await requireAdmin();
    if (!auth.ok) return auth.error;

    // Verify application exists
    const application = await getApplicationById(id);
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);

    const limitRaw = parseInt(searchParams.get('limit') || '100', 10);
    const limit = Number.isNaN(limitRaw) || limitRaw < 1 ? 100 : Math.min(limitRaw, 500);

    const offsetRaw = parseInt(searchParams.get('offset') || '0', 10);
    const offset = Number.isNaN(offsetRaw) || offsetRaw < 0 ? 0 : offsetRaw;

    // Include email logs in timeline
    const includeEmails = searchParams.get('includeEmails') !== 'false';

    // Fetch audit logs
    const auditLogs = await getAuditLogsForApplication(id, { limit, offset });

    // Fetch email logs if requested
    let emailLogs: Awaited<ReturnType<typeof getEmailLogsForApplication>> = [];
    if (includeEmails) {
      emailLogs = await getEmailLogsForApplication(id, limit);
    }

    // Build combined timeline if both are included
    let timeline: Array<{
      type: 'audit' | 'email';
      timestamp: Date;
      data: unknown;
    }> = [];

    if (includeEmails && emailLogs.length > 0) {
      // Combine and sort by timestamp
      const auditEntries = auditLogs.map(log => ({
        type: 'audit' as const,
        timestamp: log.createdAt,
        data: log,
      }));

      const emailEntries = emailLogs.map(log => ({
        type: 'email' as const,
        timestamp: log.createdAt,
        data: log,
      }));

      timeline = [...auditEntries, ...emailEntries]
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
    }

    return NextResponse.json({
      applicationId: id,
      personId: application.personId,
      auditLogs,
      emailLogs: includeEmails ? emailLogs : undefined,
      timeline: includeEmails ? timeline : undefined,
      pagination: {
        limit,
        offset,
        hasMore: auditLogs.length === limit,
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', sanitizeForLog(error instanceof Error ? error.message : 'Unknown error'));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
