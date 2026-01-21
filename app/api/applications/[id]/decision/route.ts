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
import { auth } from '@/lib/auth';
import {
  getApplicationDetail,
  updateApplicationStatus,
} from '@/lib/services/applications';
import { sendRejection, sendOfferLetter } from '@/lib/email';
import { logDecisionMade, logStatusChange } from '@/lib/audit';
import { db } from '@/lib/db';
import { DecisionType, Status } from '@/lib/generated/prisma/client';
import { sanitizeForLog } from '@/lib/security';
import { escapeHtml } from '@/lib/email/templates';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Valid decision types
 */
const VALID_DECISIONS: DecisionType[] = ['ACCEPT', 'REJECT'];

/**
 * Validate UUID format to prevent injection
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Sanitize text content
 */
function sanitizeText(text: string | null | undefined, maxLength: number = 5000): string {
  if (text === null || text === undefined) return '';
  return text.replace(/\0/g, '').substring(0, maxLength);
}

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
    const { id } = await params;

    // Validate ID format
    if (!isValidUUID(id)) {
      return NextResponse.json(
        { error: 'Invalid application ID format' },
        { status: 400 }
      );
    }

    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Admin only
    if (!session.user.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Ensure we have the user's database ID
    if (!session.user.dbUserId) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 400 }
      );
    }

    // Get application details
    const application = await getApplicationDetail(id);
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Check if application is active
    if (application.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Cannot make decision on inactive applications' },
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
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Validate decision
    const decision = body.decision as string;
    if (!decision || !VALID_DECISIONS.includes(decision as DecisionType)) {
      return NextResponse.json(
        { error: `Invalid decision. Must be one of: ${VALID_DECISIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate reason (required for rejections per GDPR)
    const reason = sanitizeText(body.reason as string | undefined, 2000);
    if (decision === 'REJECT' && !reason.trim()) {
      return NextResponse.json(
        { error: 'Reason is required for rejection decisions (GDPR compliance)' },
        { status: 400 }
      );
    }

    // Default reason for acceptance
    const finalReason = reason.trim() || 'Application accepted';

    // Optional notes
    const notes = sanitizeText(body.notes as string | undefined, 5000) || null;

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
        applicationId: id,
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
    await updateApplicationStatus(id, newStatus);

    // Log the decision
    await logDecisionMade(
      id,
      application.personId,
      decision,
      finalReason,
      session.user.dbUserId
    );

    // Log the status change
    await logStatusChange(
      id,
      application.personId,
      application.status,
      newStatus,
      session.user.dbUserId,
      `Decision: ${decision}`
    );

    // Send email if requested
    let emailResult = null;
    if (sendEmail) {
      if (decision === 'ACCEPT') {
        // Send offer letter
        emailResult = await sendOfferLetter(
          application.personId,
          id,
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
          id,
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
