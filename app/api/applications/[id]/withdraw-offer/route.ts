/**
 * Withdraw Offer API Route
 *
 * POST /api/applications/[id]/withdraw-offer
 *
 * Withdraw an accepted offer before the candidate signs the agreement.
 * Creates a REJECT decision and updates the application status to REJECTED.
 * Admin only.
 *
 * Body:
 * - reason: Required explanation for withdrawing the offer
 * - sendEmail: Whether to send rejection notification (default: true)
 *
 * Required: Admin access, application must be ACCEPTED at AGREEMENT stage
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApplicationAccess, parseJsonBody, type RouteParams } from '@/lib/api-helpers';
import { updateApplicationStatus } from '@/lib/services/applications';
import { sendRejection } from '@/lib/email';
import { logDecisionMade, logStatusChange } from '@/lib/audit';
import { db } from '@/lib/db';
import { sanitizeForLog, sanitizeText } from '@/lib/security';
import { escapeHtml } from '@/lib/email/templates';

/**
 * POST /api/applications/[id]/withdraw-offer
 *
 * Withdraw an accepted offer at AGREEMENT stage.
 * Admin only.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // No requireActive — the application is ACCEPTED, not ACTIVE
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

    // Validate application is ACCEPTED and at AGREEMENT stage
    if (application.status !== 'ACCEPTED') {
      return NextResponse.json(
        { error: `Cannot withdraw offer — application is not accepted (current status: ${application.status})` },
        { status: 400 }
      );
    }

    if (application.currentStage !== 'AGREEMENT') {
      return NextResponse.json(
        { error: `Cannot withdraw offer — application is not at agreement stage (current stage: ${application.currentStage})` },
        { status: 400 }
      );
    }

    // Parse request body
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.error;
    const body = parsed.body;

    // Validate reason (required)
    const reason = typeof body.reason === 'string' ? sanitizeText(body.reason, 2000) : null;
    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'Reason is required when withdrawing an offer' },
        { status: 400 }
      );
    }

    // Whether to send rejection email
    const sendEmail = body.sendEmail !== false;

    // Create decision record (REJECT)
    const decisionRecord = await db.decision.create({
      data: {
        applicationId: application.id,
        decision: 'REJECT',
        reason: reason.trim(),
        notes: 'Offer withdrawn at agreement stage',
        decidedBy: session.user.dbUserId,
        decidedAt: new Date(),
      },
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

    // Update application status to REJECTED
    await updateApplicationStatus(application.id, 'REJECTED');

    // Log the decision
    await logDecisionMade(
      application.id,
      application.personId,
      'REJECT',
      reason.trim(),
      session.user.dbUserId
    );

    // Log the status change
    await logStatusChange(
      application.id,
      application.personId,
      'ACCEPTED',
      'REJECTED',
      session.user.dbUserId,
      'Offer withdrawn at agreement stage'
    );

    // Send rejection email if requested
    let emailResult = null;
    if (sendEmail) {
      emailResult = await sendRejection(
        application.personId,
        application.id,
        application.person.email,
        application.person.firstName,
        application.position,
        escapeHtml(reason.trim())
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Offer withdrawn successfully',
      decision: {
        id: decisionRecord.id,
        decision: decisionRecord.decision,
        reason: decisionRecord.reason,
        notes: decisionRecord.notes,
        decidedAt: decisionRecord.decidedAt,
        decidedBy: decisionRecord.user,
      },
      applicationStatus: 'REJECTED',
      emailSent: sendEmail,
      emailResult: emailResult ? {
        success: emailResult.success,
        queued: emailResult.queued,
        emailLogId: emailResult.emailLogId,
      } : null,
    });
  } catch (error) {
    console.error('Error withdrawing offer:', sanitizeForLog(error instanceof Error ? error.message : 'Unknown error'));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
