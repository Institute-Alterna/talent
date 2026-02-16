/**
 * Individual Application API Routes
 *
 * GET /api/applications/[id] - Get application details
 * PATCH /api/applications/[id] - Update application (admin only)
 * DELETE /api/applications/[id] - Delete/withdraw application (admin only)
 *
 * Required: Authenticated user with app access
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getApplicationDetail,
  updateApplication,
  updateApplicationStatus,
  deleteApplication,
} from '@/lib/services/applications';
import {
  logRecordViewed,
  logStageChange,
  logStatusChange,
  logRecordDeleted,
} from '@/lib/audit';
import { sanitizeForLog, sanitizeText } from '@/lib/security';
import { Stage, Status } from '@/lib/generated/prisma/client';
import { isValidUUID, isValidURL } from '@/lib/utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

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
 * GET /api/applications/[id]
 *
 * Get full application details including person, assessments, interviews, decisions.
 * Requires authenticated user (hiring manager or admin).
 */
export async function GET(
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

    // Check app access permission
    if (!session.user.hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden - App access required' },
        { status: 403 }
      );
    }

    // Fetch application with full details
    const application = await getApplicationDetail(id);
    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Log the view for GDPR compliance
    if (session.user.dbUserId) {
      await logRecordViewed(
        application.personId,
        application.id,
        session.user.dbUserId,
        'application_detail'
      );
    }

    // Calculate missing fields
    const missingFields: string[] = [];
    if (application.hasResume && !application.resumeUrl) missingFields.push('Resume');
    if (application.hasAcademicBg && !application.academicBackground) missingFields.push('Academic Background');
    if (application.hasVideoIntro && !application.videoLink) missingFields.push('Video Introduction');
    if (application.hasPreviousExp && !application.previousExperience) missingFields.push('Previous Experience');
    if (application.hasOtherFile && !application.otherFileUrl) missingFields.push('Other File');

    return NextResponse.json({
      application,
      missingFields,
    });
  } catch (error) {
    console.error('Error fetching application:', sanitizeForLog(error instanceof Error ? error.message : 'Unknown error'));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/applications/[id]
 *
 * Update an application. Admin only for stage/status changes.
 * Hiring managers can only update certain fields.
 */
export async function PATCH(
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

    // Check app access permission
    if (!session.user.hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden - App access required' },
        { status: 403 }
      );
    }

    // Get existing application
    const existingApp = await getApplicationDetail(id);
    if (!existingApp) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
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

    // Determine what fields are being updated
    const requestedFields = Object.keys(body);
    const adminOnlyFields = ['currentStage', 'status'];
    const hasAdminFields = requestedFields.some(f => adminOnlyFields.includes(f));

    // Admin check for restricted fields
    if (hasAdminFields && !session.user.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required for stage/status changes' },
        { status: 403 }
      );
    }

    // Build update data with validation
    const updateData: Record<string, unknown> = {};

    // Stage change (admin only)
    if (body.currentStage !== undefined) {
      if (!VALID_STAGES.includes(body.currentStage as Stage)) {
        return NextResponse.json(
          { error: `Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.currentStage = body.currentStage;
    }

    // Status change (admin only)
    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status as Status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 }
        );
      }
      updateData.status = body.status;
    }

    // URL fields - validate if provided
    if (body.resumeUrl !== undefined) {
      if (body.resumeUrl !== null && typeof body.resumeUrl === 'string' && body.resumeUrl.length > 0) {
        if (!isValidURL(body.resumeUrl)) {
          return NextResponse.json(
            { error: 'Invalid resumeUrl format' },
            { status: 400 }
          );
        }
        updateData.resumeUrl = body.resumeUrl;
      } else {
        updateData.resumeUrl = null;
      }
    }

    if (body.videoLink !== undefined) {
      if (body.videoLink !== null && typeof body.videoLink === 'string' && body.videoLink.length > 0) {
        if (!isValidURL(body.videoLink)) {
          return NextResponse.json(
            { error: 'Invalid videoLink format' },
            { status: 400 }
          );
        }
        updateData.videoLink = body.videoLink;
      } else {
        updateData.videoLink = null;
      }
    }

    if (body.otherFileUrl !== undefined) {
      if (body.otherFileUrl !== null && typeof body.otherFileUrl === 'string' && body.otherFileUrl.length > 0) {
        if (!isValidURL(body.otherFileUrl)) {
          return NextResponse.json(
            { error: 'Invalid otherFileUrl format' },
            { status: 400 }
          );
        }
        updateData.otherFileUrl = body.otherFileUrl;
      } else {
        updateData.otherFileUrl = null;
      }
    }

    // Text fields - sanitize
    if (body.academicBackground !== undefined) {
      updateData.academicBackground = sanitizeText(body.academicBackground as string | null);
    }

    if (body.previousExperience !== undefined) {
      updateData.previousExperience = sanitizeText(body.previousExperience as string | null);
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Perform the update
    const updatedApp = await updateApplication(id, updateData);

    // Log stage change if applicable
    if (updateData.currentStage && updateData.currentStage !== existingApp.currentStage) {
      await logStageChange(
        id,
        existingApp.personId,
        existingApp.currentStage,
        updateData.currentStage as string,
        session.user.dbUserId,
        (body.reason as string) || 'Manual stage change by admin'
      );
    }

    // Log status change if applicable
    if (updateData.status && updateData.status !== existingApp.status) {
      await logStatusChange(
        id,
        existingApp.personId,
        existingApp.status,
        updateData.status as string,
        session.user.dbUserId,
        (body.reason as string) || 'Manual status change by admin'
      );
    }

    return NextResponse.json({
      application: updatedApp,
      message: 'Application updated successfully',
    });
  } catch (error) {
    console.error('Error updating application:', sanitizeForLog(error instanceof Error ? error.message : 'Unknown error'));

    // Handle specific errors
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/applications/[id]
 *
 * Soft delete an application by setting status to WITHDRAWN.
 * Use ?hardDelete=true to permanently delete the application and all related data.
 * Admin only.
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    // Check for hardDelete query parameter
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hardDelete') === 'true';

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

    // Get existing application
    const existingApp = await getApplicationDetail(id);
    if (!existingApp) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    if (hardDelete) {
      // Hard delete: permanently remove the application and all related data
      await deleteApplication(id);

      return NextResponse.json({
        success: true,
        message: 'Application permanently deleted',
      });
    }

    // Check if already withdrawn/rejected for soft delete
    if (existingApp.status === 'WITHDRAWN') {
      return NextResponse.json(
        { error: 'Application is already withdrawn' },
        { status: 400 }
      );
    }

    // Parse optional reason from request body
    let reason = 'Application withdrawn by admin';
    try {
      const body = await request.json();
      if (body.reason && typeof body.reason === 'string') {
        reason = sanitizeText(body.reason, 500) || reason;
      }
    } catch {
      // No body provided, use default reason
    }

    // Soft delete: set status to WITHDRAWN
    await updateApplicationStatus(id, 'WITHDRAWN');

    // Log the deletion
    await logRecordDeleted(
      'Application',
      id,
      existingApp.personId,
      id,
      session.user.dbUserId,
      reason
    );

    await logStatusChange(
      id,
      existingApp.personId,
      existingApp.status,
      'WITHDRAWN',
      session.user.dbUserId,
      reason
    );

    return NextResponse.json({
      success: true,
      message: 'Application withdrawn successfully',
    });
  } catch (error) {
    console.error('Error deleting application:', sanitizeForLog(error instanceof Error ? error.message : 'Unknown error'));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
