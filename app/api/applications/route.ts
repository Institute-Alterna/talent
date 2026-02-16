/**
 * Applications API Routes
 *
 * GET /api/applications - List all applications with pagination
 *
 * Supports query parameters:
 * - search: Search by position, person name, or email
 * - personId: Filter by person ID
 * - position: Filter by position
 * - stage: Filter by current stage
 * - status: Filter by status (ACTIVE, ACCEPTED, REJECTED, WITHDRAWN)
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 20, max: 100)
 * - sortBy: Sort field (createdAt, updatedAt, position)
 * - sortOrder: Sort direction (asc, desc)
 *
 * Required: Authenticated user with app access
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getApplications, getApplicationStats, getApplicationsForPipeline } from '@/lib/services/applications';
import { Stage, Status } from '@/lib/generated/prisma/client';
import { sanitizeForLog, ALLOWED_SORT_FIELDS } from '@/lib/security';
import { isValidUUID } from '@/lib/utils';

/**
 * Valid stage values
 */
const VALID_STAGES: Stage[] = [
  'APPLICATION',
  'GENERAL_COMPETENCIES',
  'SPECIALIZED_COMPETENCIES',
  'INTERVIEW',
  'AGREEMENT',
  'SIGNED',
];

/**
 * Valid status values
 */
const VALID_STATUSES: Status[] = ['ACTIVE', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'];

/**
 * GET /api/applications
 *
 * List all applications with optional filtering.
 * Requires authenticated user (hiring manager or admin).
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check app access permission
    if (!session.user.hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden - App access required' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);

    // Check if pipeline view is requested
    const viewType = searchParams.get('view');
    if (viewType === 'pipeline') {
      // Return pipeline-formatted data
      const statusParam = searchParams.get('status');
      const status = statusParam && VALID_STATUSES.includes(statusParam as Status)
        ? (statusParam as Status)
        : undefined;

      const position = searchParams.get('position')?.trim().substring(0, 100) || undefined;

      const pipelineData = await getApplicationsForPipeline({
        status,
        position,
      });

      return NextResponse.json(pipelineData);
    }

    // Standard list view
    // Validate and sanitize search parameter
    const searchRaw = searchParams.get('search');
    const search = searchRaw ? searchRaw.trim().substring(0, 100) : undefined;

    // Validate personId if provided
    const personIdRaw = searchParams.get('personId');
    let personId: string | undefined;
    if (personIdRaw) {
      if (!isValidUUID(personIdRaw)) {
        return NextResponse.json(
          { error: 'Invalid personId format' },
          { status: 400 }
        );
      }
      personId = personIdRaw;
    }

    // Validate position (sanitize to prevent injection)
    const positionRaw = searchParams.get('position');
    const position = positionRaw ? positionRaw.trim().substring(0, 100) : undefined;

    // Validate stage
    const stageParam = searchParams.get('stage');
    const stage = stageParam && VALID_STAGES.includes(stageParam as Stage)
      ? (stageParam as Stage)
      : undefined;

    // Validate status
    const statusParam = searchParams.get('status');
    const status = statusParam && VALID_STATUSES.includes(statusParam as Status)
      ? (statusParam as Status)
      : undefined;

    // Parse pagination with bounds
    const pageRaw = parseInt(searchParams.get('page') || '1', 10);
    const page = Number.isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;

    const limitRaw = parseInt(searchParams.get('limit') || '20', 10);
    const limit = Number.isNaN(limitRaw) || limitRaw < 1 ? 20 : Math.min(limitRaw, 100);

    // Validate sort parameters
    const sortByParam = searchParams.get('sortBy');
    const sortBy = sortByParam && ALLOWED_SORT_FIELDS.includes(sortByParam as typeof ALLOWED_SORT_FIELDS[number])
      ? (sortByParam as typeof ALLOWED_SORT_FIELDS[number])
      : 'createdAt';

    const sortOrderParam = searchParams.get('sortOrder');
    const sortOrder = sortOrderParam === 'asc' ? 'asc' : 'desc';

    // Fetch applications and stats
    const [applicationsResult, stats] = await Promise.all([
      getApplications({
        search,
        personId,
        position,
        stage,
        status,
        page,
        limit,
        sortBy,
        sortOrder,
      }),
      getApplicationStats({
        status,
        position,
      }),
    ]);

    return NextResponse.json({
      ...applicationsResult,
      stats,
    });
  } catch (error) {
    console.error('Error fetching applications:', sanitizeForLog(error instanceof Error ? error.message : 'Unknown error'));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
