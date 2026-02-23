/**
 * Decision API Route
 *
 * POST /api/applications/[id]/decision
 *
 * Record a final hiring decision for the application.
 * Admin only.
 *
 * Body:
 * - decision: "ACCEPT" or "REJECT"
 * - reason: Required for rejections (GDPR compliance)
 * - notes: Optional additional notes
 * - sendEmail: Whether to send notification email (default: true)
 *
 * Required: Admin access
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApplicationAccess, parseJsonBody, type RouteParams } from '@/lib/api-helpers';
import {
  updateApplicationStatus,
  advanceApplicationStage,
} from '@/lib/services/applications';
import { sendRejection, sendOfferLetter } from '@/lib/email';
import { logDecisionMade, logStatusChange, logStageChange } from '@/lib/audit';
import { db } from '@/lib/db';
import { DecisionType, Status } from '@/lib/generated/prisma/client';
import { sanitizeForLog, sanitizeText } from '@/lib/security';
import { escapeHtml } from '@/lib/email/templates';

/**
 * Valid decision types
 */
const VALID_DECISIONS: DecisionType[] = ['ACCEPT', 'REJECT'];

/**
 * POST /api/applications/[id]/decision
 *
 * Record a hiring decision.
 * Admin only.
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const access = await requireApplicationAccess(params, { level: 'admin', requireActive: true });
    if (!access.ok) return access.error;
    const { session, application } = access;

    // Ensure we have the user's database ID
    if (!session.user.dbUserId) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 400 }
      );
    }

    // Check if a decision already exists
    if (application.decisions.length > 0) {
      return NextResponse.json(
        { error: 'A decision has already been recorded for this application' },
        { status: 400 }
      );
    }

    // Parse request body
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.error;
    const body = parsed.body;

    // Validate decision
    const decision = body.decision as string;
    if (!decision || !VALID_DECISIONS.includes(decision as DecisionType)) {
      return NextResponse.json(
        { error: `Invalid decision. Must be one of: ${VALID_DECISIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate reason (required for rejections per GDPR)
    const reason = typeof body.reason === 'string' ? sanitizeText(body.reason, 2000) : null;
    if (decision === 'REJECT' && (!reason || !reason.trim())) {
      return NextResponse.json(
        { error: 'Reason is required for rejection decisions (GDPR compliance)' },
        { status: 400 }
      );
    }

    // Default reason for acceptance
    const finalReason = reason?.trim() || 'Application accepted';

    // Optional notes
    const notes = typeof body.notes === 'string' ? sanitizeText(body.notes, 5000) : null;

    // Whether to send email (default: true)
    const sendEmail = body.sendEmail !== false;

    // Optional start date for acceptance
    let startDate: Date | undefined;
    if (decision === 'ACCEPT' && body.startDate) {
      const parsedDate = new Date(body.startDate as string);
      if (Number.isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid startDate format' },
          { status: 400 }
        );
      }
      startDate = parsedDate;
    }

    // Create decision record
    const decisionRecord = await db.decision.create({
      data: {
        applicationId: application.id,
        decision: decision as DecisionType,
        reason: finalReason,
        notes,
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

    // Update application status
    const newStatus: Status = decision === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED';
    await updateApplicationStatus(application.id, newStatus);

    // Log the decision
    await logDecisionMade(
      application.id,
      application.personId,
      decision,
      finalReason,
      session.user.dbUserId
    );

    // Log the status change
    await logStatusChange(
      application.id,
      application.personId,
      application.status,
      newStatus,
      session.user.dbUserId,
      `Decision: ${decision}`
    );

    // Advance to AGREEMENT stage on acceptance
    if (decision === 'ACCEPT') {
      await advanceApplicationStage(application.id, 'AGREEMENT');
      await logStageChange(
        application.id,
        application.personId,
        application.currentStage,
        'AGREEMENT',
        session.user.dbUserId,
        'Auto-advanced: Application accepted'
      );
    }

    // Send email if requested
    let emailResult = null;
    if (sendEmail) {
      if (decision === 'ACCEPT') {
        // Send offer letter
        emailResult = await sendOfferLetter(
          application.personId,
          application.id,
          application.person.email,
          application.person.firstName,
          application.position,
          startDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Default: 2 weeks from now
          notes || undefined
        );
      } else {
        // Send rejection
        emailResult = await sendRejection(
          application.personId,
          application.id,
          application.person.email,
          application.person.firstName,
          application.position,
          escapeHtml(finalReason)
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Application ${decision === 'ACCEPT' ? 'accepted' : 'rejected'} successfully`,
      decision: {
        id: decisionRecord.id,
        decision: decisionRecord.decision,
        reason: decisionRecord.reason,
        notes: decisionRecord.notes,
        decidedAt: decisionRecord.decidedAt,
        decidedBy: decisionRecord.user,
      },
      applicationStatus: newStatus,
      emailSent: sendEmail,
      emailResult: emailResult ? {
        success: emailResult.success,
        queued: emailResult.queued,
        emailLogId: emailResult.emailLogId,
      } : null,
    });
  } catch (error) {
    console.error('Error recording decision:', sanitizeForLog(error instanceof Error ? error.message : 'Unknown error'));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
