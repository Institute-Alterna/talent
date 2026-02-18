/**
 * Persons API Routes
 *
 * GET /api/persons - List all persons with pagination
 *
 * Supports query parameters:
 * - search: Search by name or email
 * - generalCompetenciesCompleted: Filter by GC status ("true" or "false")
 * - hasActiveApplications: Filter by active applications ("true" or "false")
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 20, max: 100)
 *
 * Required: Authenticated user with app access
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAccess } from '@/lib/api-helpers';
import { getPersons, getPersonStats } from '@/lib/services/persons';
import { sanitizeForLog } from '@/lib/security';

/**
 * GET /api/persons
 *
 * List all persons with optional filtering.
 * Requires authenticated user (hiring manager or admin).
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAccess();
    if (!auth.ok) return auth.error;

    // Parse query parameters with safe defaults
    const { searchParams } = new URL(request.url);

    // Validate and sanitize search parameter
    const searchRaw = searchParams.get('search');
    const search = searchRaw ? searchRaw.trim().substring(0, 100) : undefined;

    // Parse boolean filters
    const gcCompletedParam = searchParams.get('generalCompetenciesCompleted');
    const generalCompetenciesCompleted =
      gcCompletedParam === 'true' ? true : gcCompletedParam === 'false' ? false : undefined;

    const activeAppsParam = searchParams.get('hasActiveApplications');
    const hasActiveApplications =
      activeAppsParam === 'true' ? true : activeAppsParam === 'false' ? false : undefined;

    // Parse pagination with bounds
    const pageRaw = parseInt(searchParams.get('page') || '1', 10);
    const page = Number.isNaN(pageRaw) || pageRaw < 1 ? 1 : pageRaw;

    const limitRaw = parseInt(searchParams.get('limit') || '20', 10);
    const limit = Number.isNaN(limitRaw) || limitRaw < 1 ? 20 : Math.min(limitRaw, 100);

    // Fetch persons and stats
    const [personsResult, stats] = await Promise.all([
      getPersons({
        search,
        generalCompetenciesCompleted,
        hasActiveApplications,
        page,
        limit,
      }),
      getPersonStats(),
    ]);

    return NextResponse.json({
      ...personsResult,
      stats,
    });
  } catch (error) {
    console.error('Error fetching persons:', sanitizeForLog(error instanceof Error ? error.message : 'Unknown error'));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
