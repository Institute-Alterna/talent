/**
 * Audit Logs API Route
 *
 * GET /api/audit-logs - Get paginated audit logs (admin-only)
 *
 * Query Parameters:
 * - limit: number (default 30, max 100)
 * - cursor: string (ID of last item for pagination)
 * - actorId: string (filter by user who performed action)
 * - search: string (search in action text)
 * - actionTypes: comma-separated list of ActionType values
 *
 * Required: Authenticated admin user
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-helpers';
import { getAllAuditLogs, getAuditActors } from '@/lib/audit';
import { sanitizeForLog } from '@/lib/security';
import { ActionType } from '@/lib/generated/prisma/client';

const VALID_ACTION_TYPES: ActionType[] = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'VIEW',
  'EMAIL_SENT',
  'STATUS_CHANGE',
  'STAGE_CHANGE',
];

/**
 * GET /api/audit-logs
 *
 * Get paginated audit logs with optional filtering.
 * Requires authenticated admin user.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.error;

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const cursor = searchParams.get('cursor') || undefined;
    const actorId = searchParams.get('actorId') || undefined;
    const searchTerm = searchParams.get('search') || undefined;
    const actionTypesParam = searchParams.get('actionTypes');
    const includeActors = searchParams.get('includeActors') === 'true';

    // Validate and sanitize limit
    let limit = 30;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100) {
        limit = parsedLimit;
      }
    }

    // Validate action types
    let actionTypes: ActionType[] | undefined;
    if (actionTypesParam) {
      const requestedTypes = actionTypesParam.split(',');
      actionTypes = requestedTypes.filter((type): type is ActionType =>
        VALID_ACTION_TYPES.includes(type as ActionType)
      );
      if (actionTypes.length === 0) {
        actionTypes = undefined;
      }
    }

    // Fetch audit logs
    const result = await getAllAuditLogs({
      limit,
      cursor,
      actorId,
      searchTerm,
      actionTypes,
    });

    // Optionally include actors for filter dropdown
    let actors: Awaited<ReturnType<typeof getAuditActors>> | undefined;
    if (includeActors) {
      actors = await getAuditActors();
    }

    // Format logs for response
    const logs = result.logs.map((log) => ({
      id: log.id,
      action: log.action,
      actionType: log.actionType,
      createdAt: log.createdAt.toISOString(),
      ipAddress: log.ipAddress,
      person: log.person
        ? {
            id: log.person.id,
            firstName: log.person.firstName,
            lastName: log.person.lastName,
            email: log.person.email,
          }
        : null,
      application: log.application
        ? {
            id: log.application.id,
            position: log.application.position,
          }
        : null,
      user: log.user
        ? {
            id: log.user.id,
            displayName: log.user.displayName,
            email: log.user.email,
          }
        : null,
    }));

    return NextResponse.json({
      logs,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
      ...(actors && { actors }),
    });
  } catch (error) {
    console.error(
      'Error fetching audit logs:',
      sanitizeForLog(error instanceof Error ? error.message : 'Unknown error')
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
