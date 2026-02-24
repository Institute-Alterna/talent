/**
 * Review SC Assessment API Route
 *
 * POST /api/applications/[id]/review-sc
 *
 * Admin-only endpoint to mark a specialised competency assessment as passed or failed.
 *
 * Body:
 * - assessmentId: string (UUID of the assessment to review)
 * - passed: boolean (true = pass, false = fail)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApplicationAccess, parseJsonBody, type RouteParams } from '@/lib/api-helpers';
import { db } from '@/lib/db';
import { isValidUUID } from '@/lib/utils';
import { sanitizeForLog } from '@/lib/security';
import { logAssessmentCompleted } from '@/lib/audit';

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const access = await requireApplicationAccess(params, { level: 'admin' });
    if (!access.ok) return access.error;
    const { session, application } = access;

    // Ensure we have the user's database ID
    if (!session.user.dbUserId) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 400 }
      );
    }

    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.error;
    const body = parsed.body;

    // Validate assessmentId
    const assessmentId = typeof body.assessmentId === 'string' ? body.assessmentId : '';
    if (!assessmentId || !isValidUUID(assessmentId)) {
      return NextResponse.json({ error: 'Valid assessmentId is required' }, { status: 400 });
    }

    // Validate passed
    if (typeof body.passed !== 'boolean') {
      return NextResponse.json({ error: 'passed must be a boolean' }, { status: 400 });
    }

    // Find the assessment
    const assessment = await db.assessment.findFirst({
      where: {
        id: assessmentId,
        applicationId: application.id,
        assessmentType: 'SPECIALIZED_COMPETENCIES',
      },
    });

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found for this application' }, { status: 404 });
    }

    if (!assessment.completedAt) {
      return NextResponse.json({ error: 'Cannot review an assessment that has not been submitted' }, { status: 400 });
    }

    // Update the assessment with review
    const updated = await db.assessment.update({
      where: { id: assessmentId },
      data: {
        passed: body.passed,
        reviewedAt: new Date(),
        reviewedBy: session.user.dbUserId,
      },
    });

    // Log the review
    await logAssessmentCompleted(
      application.personId,
      application.id,
      `Specialised Competency ${body.passed ? 'approved' : 'rejected'}`,
      null,
      body.passed
    );

    return NextResponse.json({
      success: true,
      assessment: {
        id: updated.id,
        passed: updated.passed,
        reviewedAt: updated.reviewedAt,
        reviewedBy: updated.reviewedBy,
      },
    });
  } catch (error) {
    console.error('Error reviewing SC assessment:', sanitizeForLog(error instanceof Error ? error.message : 'Unknown error'));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
