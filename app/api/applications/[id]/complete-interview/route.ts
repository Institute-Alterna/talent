/**
 * Complete Interview API Route
 *
 * POST /api/applications/[id]/complete-interview
 *
 * Mark an existing interview as completed with notes.
 *
 * Body:
 * - notes: Required interview notes (max 2000 chars)
 *
 * Required: Authenticated user with app access
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getApplicationDetail } from '@/lib/services/applications';
import { logInterviewCompleted } from '@/lib/audit';
import { db } from '@/lib/db';
import { sanitizeForLog } from '@/lib/security';

interface RouteParams {
  params: Promise<{ id: string }>;
}

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
function sanitizeText(text: string | null | undefined, maxLength: number = 5000): string | null {
  if (text === null || text === undefined) return null;
  // Remove null bytes to prevent injection
  return text.replace(/\0/g, '').substring(0, maxLength);
}

/**
 * POST /api/applications/[id]/complete-interview
 *
 * Mark interview as completed with notes.
 * Requires authenticated user (hiring manager or admin).
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    // Validate ID format
    if (!isValidUUID(id)) {
      console.error('[Complete Interview] Invalid UUID format:', sanitizeForLog(id));
      return NextResponse.json(
        { error: 'Invalid application ID format' },
        { status: 400 }
      );
    }

    // Check authentication
    const session = await auth();
    if (!session?.user) {
      console.error('[Complete Interview] Unauthorized access attempt for application:', sanitizeForLog(id));
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check app access permission
    if (!session.user.hasAccess) {
      console.error('[Complete Interview] Access denied for user:', sanitizeForLog(session.user.email));
      return NextResponse.json(
        { error: 'Forbidden - App access required' },
        { status: 403 }
      );
    }

    // Get application details
    const application = await getApplicationDetail(id);
    if (!application) {
      console.error('[Complete Interview] Application not found:', sanitizeForLog(id));
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Get existing interview
    const existingInterview = await db.interview.findFirst({
      where: {
        applicationId: id,
        completedAt: null, // Only complete non-completed interviews
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!existingInterview) {
      console.error('[Complete Interview] No active interview found for application:', sanitizeForLog(id));
      return NextResponse.json(
        { error: 'No active interview found to complete' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { notes } = body;

    // Validate required fields
    if (!notes || typeof notes !== 'string' || !notes.trim()) {
      console.error('[Complete Interview] Missing or invalid notes');
      return NextResponse.json(
        { error: 'Interview notes are required' },
        { status: 400 }
      );
    }

    // Sanitize notes (max 2000 chars)
    const sanitizedNotes = sanitizeText(notes.trim(), 2000);
    if (!sanitizedNotes) {
      console.error('[Complete Interview] Notes sanitization resulted in empty string');
      return NextResponse.json(
        { error: 'Interview notes are required' },
        { status: 400 }
      );
    }

    // Update interview record
    const completedInterview = await db.interview.update({
      where: { id: existingInterview.id },
      data: {
        completedAt: new Date(),
        notes: sanitizedNotes,
        updatedAt: new Date(),
      },
    });

    // Log the interview completion
    await logInterviewCompleted(
      id,
      application.personId,
      existingInterview.interviewerId,
      session.user.dbUserId
    );

    console.log('[Complete Interview] Success:', {
      applicationId: sanitizeForLog(id),
      interviewId: sanitizeForLog(existingInterview.id),
      completedBy: sanitizeForLog(session.user.email),
    });

    return NextResponse.json({
      success: true,
      message: 'Interview marked as completed',
      interview: {
        id: completedInterview.id,
        completedAt: completedInterview.completedAt,
        notes: completedInterview.notes,
      },
    });
  } catch (error) {
    console.error('[Complete Interview] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to complete interview',
        details: error instanceof Error ? sanitizeForLog(error.message) : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
