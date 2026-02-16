/**
 * PDF Export API Route
 *
 * GET /api/applications/[id]/export-pdf - Generate and download candidate report PDF
 *
 * Query Parameters:
 * - type: 'candidate' (default) | 'audit' - Type of report to generate
 * - includeAuditLogs: 'true' | 'false' - Include audit logs in candidate report
 * - confidential: 'true' | 'false' - Include confidentiality notice
 *
 * Required: Authenticated user with app access (hiring manager or admin)
 *
 * Security:
 * - All data is sanitized before PDF generation
 * - UUID validation prevents injection attacks
 * - Export action is logged to audit trail
 * - Rate limiting applied (standard API limits)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  generateCandidateReportPdf,
  generateAuditReportPdf,
  PdfGenerationError,
} from '@/lib/pdf';
import { getApplicationDetail } from '@/lib/services/applications';
import { createAuditLog } from '@/lib/audit';
import { sanitizeForLog } from '@/lib/security';
import { isValidUUID } from '@/lib/utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Parse boolean query parameter
 */
function parseBooleanParam(value: string | null, defaultValue: boolean): boolean {
  if (value === null) return defaultValue;
  return value.toLowerCase() === 'true';
}

/**
 * GET /api/applications/[id]/export-pdf
 *
 * Generate and download a PDF report for an application.
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing application ID
 * @returns PDF file as binary response or error JSON
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Validate ID format to prevent injection
    if (!isValidUUID(id)) {
      return NextResponse.json({ error: 'Invalid application ID format' }, { status: 400 });
    }

    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check app access permission (hiring managers and admins can export)
    if (!session.user.hasAccess) {
      return NextResponse.json({ error: 'Forbidden - App access required' }, { status: 403 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const reportType = searchParams.get('type') || 'candidate';
    const includeAuditLogs = parseBooleanParam(searchParams.get('includeAuditLogs'), true);
    const confidential = parseBooleanParam(searchParams.get('confidential'), true);

    // Validate report type
    if (reportType !== 'candidate' && reportType !== 'audit') {
      return NextResponse.json(
        { error: "Invalid report type. Must be 'candidate' or 'audit'" },
        { status: 400 }
      );
    }

    // Verify application exists and get person info for audit log
    const application = await getApplicationDetail(id);
    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Generate the PDF based on type
    let result;

    if (reportType === 'candidate') {
      result = await generateCandidateReportPdf(id, {
        confidential,
        includeAuditLogs,
        maxAuditLogs: 50,
      });
    } else {
      // Audit report
      const subjectName = `${application.person.firstName} ${application.person.lastName}`;
      result = await generateAuditReportPdf('application', id, subjectName, {
        confidential,
        maxAuditLogs: 100,
      });
    }

    // Log the export action for compliance
    await createAuditLog({
      personId: application.personId,
      applicationId: id,
      userId: session.user.dbUserId,
      action: `PDF ${reportType} report exported`,
      actionType: 'VIEW',
      details: {
        reportType,
        includeAuditLogs,
        confidential,
        fileSize: result.size,
        filename: result.filename,
      },
    });

    // Return the PDF as a binary response
    // Convert Buffer to Uint8Array for NextResponse compatibility
    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': result.size.toString(),
        // Security headers
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    // Handle specific PDF generation errors
    if (error instanceof PdfGenerationError) {
      console.error(
        'PDF generation error:',
        sanitizeForLog(error.message),
        error.cause ? sanitizeForLog(String(error.cause)) : ''
      );

      // Return appropriate status based on error
      if (error.message === 'Application not found') {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 });
      }

      if (error.message === 'Invalid application ID format') {
        return NextResponse.json({ error: 'Invalid application ID format' }, { status: 400 });
      }

      return NextResponse.json(
        { error: 'Failed to generate PDF report. Please try again.' },
        { status: 500 }
      );
    }

    // Handle unexpected errors
    console.error(
      'Error exporting PDF:',
      sanitizeForLog(error instanceof Error ? error.message : 'Unknown error')
    );

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
