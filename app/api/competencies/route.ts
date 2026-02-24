/**
 * Specialised Competencies API Route
 *
 * GET /api/competencies — List all competencies (authenticated users)
 * POST /api/competencies — Create new competency (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAccess, requireAdmin, parseJsonBody } from '@/lib/api-helpers';
import { listCompetencies, createCompetency } from '@/lib/services/competencies';
import { isValidURL } from '@/lib/utils';
import { recruitment } from '@/config/recruitment';
import { sanitizeForLog } from '@/lib/security';

/**
 * GET /api/competencies
 *
 * List all specialised competencies.
 * Admins see all (including inactive); others see active only.
 */
export async function GET() {
  try {
    const auth = await requireAccess();
    if (!auth.ok) return auth.error;

    // Admins can see all (including inactive), others see active only
    const activeOnly = !auth.session.user?.isAdmin;
    const competencies = await listCompetencies(activeOnly);

    return NextResponse.json({ competencies });
  } catch (error) {
    console.error(
      'Error listing competencies:',
      sanitizeForLog(error instanceof Error ? error.message : 'Unknown error')
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/competencies
 *
 * Create a new specialised competency.
 * Admin only.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.error;

    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.error;
    const body = parsed.body;

    // Validate required fields
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const category = typeof body.category === 'string' ? body.category.trim() : '';
    const tallyFormUrl = typeof body.tallyFormUrl === 'string' ? body.tallyFormUrl.trim() : '';
    const criterion = typeof body.criterion === 'string' ? body.criterion.trim() : '';

    if (!name || name.length > 200) {
      return NextResponse.json({ error: 'Name is required (max 200 characters)' }, { status: 400 });
    }

    if (!category || !recruitment.scCategories.includes(category as (typeof recruitment.scCategories)[number])) {
      return NextResponse.json(
        { error: `Category must be one of: ${recruitment.scCategories.join(', ')}` },
        { status: 400 }
      );
    }

    if (!tallyFormUrl || !isValidURL(tallyFormUrl)) {
      return NextResponse.json({ error: 'A valid Tally form URL is required' }, { status: 400 });
    }

    if (!criterion || criterion.length > 2000) {
      return NextResponse.json(
        { error: 'Criterion is required (max 2000 characters)' },
        { status: 400 }
      );
    }

    const competency = await createCompetency({ name, category, tallyFormUrl, criterion });

    return NextResponse.json({ competency }, { status: 201 });
  } catch (error) {
    console.error(
      'Error creating competency:',
      sanitizeForLog(error instanceof Error ? error.message : 'Unknown error')
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
