/**
 * Shared Webhook Helpers
 *
 * Common utilities extracted from webhook route handlers to eliminate duplication.
 * Used by all Tally webhook routes (application, general-competencies, specialized-competencies).
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  verifyWebhook,
  getClientIP,
  webhookRateLimiter,
  getRateLimitHeaders,
  type TallyWebhookPayload,
} from '@/lib/webhooks';

/**
 * Standard webhook error response
 */
export function webhookErrorResponse(
  message: string,
  status: number,
  headers?: Record<string, string>
): NextResponse {
  return NextResponse.json({ error: message }, { status, headers });
}

/**
 * Standard CORS preflight response for webhook routes
 */
export function webhookOptionsResponse(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-webhook-secret, Authorization',
    },
  });
}

/**
 * Result of verifying and parsing a webhook request.
 * Discriminated union: check `ok` before accessing fields.
 */
export type WebhookParseResult =
  | {
      ok: true;
      payload: TallyWebhookPayload;
      ip: string | null;
      rateLimitHeaders: Record<string, string>;
    }
  | {
      ok: false;
      error: NextResponse;
    };

/**
 * Parse, verify, and validate a Tally webhook request.
 *
 * Consolidates the repeated boilerplate across all webhook routes:
 * 1. Extract client IP
 * 2. Check rate limit
 * 3. Read raw body
 * 4. Verify webhook signature and IP
 * 5. Parse JSON
 * 6. Validate payload structure
 *
 * @param request - The incoming NextRequest
 * @param logPrefix - Log prefix for console.error messages (e.g. '[Webhook]', '[Webhook GC]')
 * @returns Discriminated union with parsed payload or error response
 */
export async function parseAndVerifyWebhook(
  request: NextRequest,
  logPrefix: string
): Promise<WebhookParseResult> {
  const ip = getClientIP(request.headers);

  // Check rate limit
  const rateLimitResult = webhookRateLimiter(ip || 'unknown');
  const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);

  if (!rateLimitResult.allowed) {
    return { ok: false, error: webhookErrorResponse('Rate limit exceeded', 429, rateLimitHeaders) };
  }

  // Read raw body for signature verification
  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return {
      ok: false,
      error: webhookErrorResponse('Failed to read request body', 400, rateLimitHeaders),
    };
  }

  // Verify webhook signature and IP
  const verification = verifyWebhook(rawBody, request.headers);
  if (!verification.valid) {
    console.error(`${logPrefix} Verification failed:`, verification.error);
    return {
      ok: false,
      error: webhookErrorResponse(
        verification.error || 'Verification failed',
        401,
        rateLimitHeaders
      ),
    };
  }

  // Parse JSON payload
  let payload: TallyWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return {
      ok: false,
      error: webhookErrorResponse('Invalid JSON payload', 400, rateLimitHeaders),
    };
  }

  // Validate payload structure
  if (!payload.data?.submissionId || !payload.data?.fields) {
    return {
      ok: false,
      error: webhookErrorResponse('Invalid payload structure', 400, rateLimitHeaders),
    };
  }

  return { ok: true, payload, ip, rateLimitHeaders };
}
