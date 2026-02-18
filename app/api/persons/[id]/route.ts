/**
 * Individual Person API Routes
 *
 * GET /api/persons/[id] - Get person details with applications
 *
 * Required: Authenticated user with app access
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAccess } from '@/lib/api-helpers';
import { getPersonWithApplications } from '@/lib/services/persons';
import { getAuditLogsForPerson } from '@/lib/audit';
import { getEmailLogsForPerson } from '@/lib/email';
import { logRecordViewed } from '@/lib/audit';
import { sanitizeForLog } from '@/lib/security';
import { isValidUUID } from '@/lib/utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/persons/[id]
 *
 * Get a single person with all their applications.
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
        { error: 'Invalid person ID format' },
        { status: 400 }
      );
    }

    const auth = await requireAccess();
    if (!auth.ok) return auth.error;
    const { session } = auth;

    // Fetch person with applications
    const person = await getPersonWithApplications(id);
    if (!person) {
      return NextResponse.json(
        { error: 'Person not found' },
        { status: 404 }
      );
    }

    // Parse query parameters for optional data
    const { searchParams } = new URL(request.url);
    const includeAuditLogs = searchParams.get('includeAuditLogs') === 'true';
    const includeEmailLogs = searchParams.get('includeEmailLogs') === 'true';

    // Fetch additional data if requested
    const additionalData: Record<string, unknown> = {};

    if (includeAuditLogs) {
      additionalData.auditLogs = await getAuditLogsForPerson(id, { limit: 50 });
    }

    if (includeEmailLogs) {
      additionalData.emailLogs = await getEmailLogsForPerson(id, 50);
    }

    // Log the view for GDPR compliance (admin only to avoid excessive logging)
    if (session.user.isAdmin && session.user.dbUserId) {
      await logRecordViewed(
        person.id,
        null,
        session.user.dbUserId,
        'person_detail'
      );
    }

    return NextResponse.json({
      person,
      ...additionalData,
    });
  } catch (error) {
    console.error('Error fetching person:', sanitizeForLog(error instanceof Error ? error.message : 'Unknown error'));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
