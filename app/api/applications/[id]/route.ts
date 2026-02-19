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
import {
  updateApplication,
  updateApplicationStatus,
  deleteApplication,
} from '@/lib/services/applications';
import { calcMissingFields } from '@/lib/utils';
import {
  logRecordViewed,
  logStageChange,
  logStatusChange,
  logRecordDeleted,
} from '@/lib/audit';
import { sanitizeForLog, sanitizeText } from '@/lib/security';
import { Stage, Status } from '@/lib/generated/prisma/client';
import { isValidURL } from '@/lib/utils';
import { requireApplicationAccess, parseJsonBody, type RouteParams } from '@/lib/api-helpers';
import { VALID_STAGES, VALID_STATUSES } from '@/lib/constants';

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
    const access = await requireApplicationAccess(params);
    if (!access.ok) return access.error;
    const { session, application } = access;

    // Log the view for GDPR compliance
    if (session.user.dbUserId) {
      await logRecordViewed(
        application.personId,
        application.id,
        session.user.dbUserId,
        'application_detail'
      );
    }

    return NextResponse.json({
      application,
      missingFields: calcMissingFields(application),
    }, {
      headers: {
        'Cache-Control': 'private, max-age=30',
      },
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
    const access = await requireApplicationAccess(params);
    if (!access.ok) return access.error;
    const { session, application: existingApp } = access;

    // Parse request body
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.error;
    const body = parsed.body;

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
    const updatedApp = await updateApplication(existingApp.id, updateData);

    // Log stage change if applicable
    if (updateData.currentStage && updateData.currentStage !== existingApp.currentStage) {
      await logStageChange(
        existingApp.id,
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
        existingApp.id,
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
    // Check for hardDelete query parameter
    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hardDelete') === 'true';

    const access = await requireApplicationAccess(params, { level: 'admin' });
    if (!access.ok) return access.error;
    const { session, application: existingApp } = access;

    if (hardDelete) {
      // Hard delete: permanently remove the application and all related data
      await deleteApplication(existingApp.id);

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
    await updateApplicationStatus(existingApp.id, 'WITHDRAWN');

    // Log the deletion
    await logRecordDeleted(
      'Application',
      existingApp.id,
      existingApp.personId,
      existingApp.id,
      session.user.dbUserId,
      reason
    );

    await logStatusChange(
      existingApp.id,
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
