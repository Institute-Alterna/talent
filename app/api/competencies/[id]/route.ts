/**
 * Specialised Competency Detail API Route
 *
 * GET /api/competencies/[id] — Get competency details
 * PUT /api/competencies/[id] — Update competency (admin only)
 * DELETE /api/competencies/[id] — Soft-delete competency (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAccess, requireAdmin, parseJsonBody, type RouteParams } from '@/lib/api-helpers';
import { getCompetencyById, updateCompetency, deactivateCompetency, reactivateCompetency, hardDeleteCompetency } from '@/lib/services/competencies';
import { isValidUUID, isValidURL } from '@/lib/utils';
import { recruitment } from '@/config/recruitment';
import { sanitizeForLog } from '@/lib/security';
import type { UpdateSpecialisedCompetencyData } from '@/types';

/**
 * GET /api/competencies/[id]
 *
 * Get a single specialised competency by ID.
 * Requires authenticated user with app access.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAccess();
    if (!auth.ok) return auth.error;

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: 'Invalid competency ID' }, { status: 400 });
    }

    const competency = await getCompetencyById(id);
    if (!competency) {
      return NextResponse.json({ error: 'Competency not found' }, { status: 404 });
    }

    return NextResponse.json({ competency });
  } catch (error) {
    console.error(
      'Error getting competency:',
      sanitizeForLog(error instanceof Error ? error.message : 'Unknown error')
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/competencies/[id]
 *
 * Update a specialised competency.
 * Admin only. Supports partial updates.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.error;

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: 'Invalid competency ID' }, { status: 400 });
    }

    const existing = await getCompetencyById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Competency not found' }, { status: 404 });
    }

    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.error;
    const body = parsed.body;

    // Build update data with validation
    const data: UpdateSpecialisedCompetencyData = {};

    if (body.name !== undefined) {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name || name.length > 200) {
        return NextResponse.json(
          { error: 'Name is required (max 200 characters)' },
          { status: 400 }
        );
      }
      data.name = name;
    }

    if (body.category !== undefined) {
      const category = typeof body.category === 'string' ? body.category.trim() : '';
      if (!category || !recruitment.scCategories.includes(category as (typeof recruitment.scCategories)[number])) {
        return NextResponse.json(
          { error: `Category must be one of: ${recruitment.scCategories.join(', ')}` },
          { status: 400 }
        );
      }
      data.category = category;
    }

    if (body.tallyFormUrl !== undefined) {
      const tallyFormUrl = typeof body.tallyFormUrl === 'string' ? body.tallyFormUrl.trim() : '';
      if (!tallyFormUrl || !isValidURL(tallyFormUrl)) {
        return NextResponse.json(
          { error: 'A valid Tally form URL is required' },
          { status: 400 }
        );
      }
      data.tallyFormUrl = tallyFormUrl;
    }

    if (body.criterion !== undefined) {
      const criterion = typeof body.criterion === 'string' ? body.criterion.trim() : '';
      if (!criterion || criterion.length > 2000) {
        return NextResponse.json(
          { error: 'Criterion is required (max 2000 characters)' },
          { status: 400 }
        );
      }
      data.criterion = criterion;
    }

    if (body.isActive !== undefined) {
      if (typeof body.isActive !== 'boolean') {
        return NextResponse.json({ error: 'isActive must be a boolean' }, { status: 400 });
      }
      data.isActive = body.isActive;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const competency = await updateCompetency(id, data);

    return NextResponse.json({ competency });
  } catch (error) {
    console.error(
      'Error updating competency:',
      sanitizeForLog(error instanceof Error ? error.message : 'Unknown error')
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/competencies/[id]
 *
 * Soft-delete a specialised competency (sets isActive = false).
 * Admin only.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.error;

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: 'Invalid competency ID' }, { status: 400 });
    }

    const existing = await getCompetencyById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Competency not found' }, { status: 404 });
    }

    // Hard delete when ?force=true — only if no assessments reference it
    const force = new URL(request.url).searchParams.get('force') === 'true';
    if (force) {
      try {
        const competency = await hardDeleteCompetency(id);
        return NextResponse.json({ competency, message: 'Competency permanently deleted' });
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Cannot hard-delete competency';
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }

    if (!existing.isActive) {
      return NextResponse.json({ error: 'Competency is already deactivated' }, { status: 400 });
    }

    const competency = await deactivateCompetency(id);

    return NextResponse.json({ competency, message: 'Competency deactivated' });
  } catch (error) {
    console.error(
      'Error deactivating competency:',
      sanitizeForLog(error instanceof Error ? error.message : 'Unknown error')
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/competencies/[id]
 *
 * Reactivate a soft-deleted specialised competency (sets isActive = true).
 * Admin only.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.error;

    const { id } = await params;
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: 'Invalid competency ID' }, { status: 400 });
    }

    const existing = await getCompetencyById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Competency not found' }, { status: 404 });
    }

    if (existing.isActive) {
      return NextResponse.json({ error: 'Competency is already active' }, { status: 400 });
    }

    const competency = await reactivateCompetency(id);

    return NextResponse.json({ competency, message: 'Competency reactivated' });
  } catch (error) {
    console.error(
      'Error reactivating competency:',
      sanitizeForLog(error instanceof Error ? error.message : 'Unknown error')
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
