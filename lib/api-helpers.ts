import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { isValidUUID } from '@/lib/utils';
import { getApplicationDetail } from '@/lib/services/applications';
import type { Session } from 'next-auth';
import type { ApplicationDetail } from '@/types/application';

export type AuthSuccess = { ok: true; session: Session; error: null };
export type AuthFailure = { ok: false; session: null; error: NextResponse };
export type AuthResult = AuthSuccess | AuthFailure;

/**
 * Require any authenticated user (logged in only, no access check).
 */
export async function requireAuth(): Promise<AuthResult> {
  const session = await auth();
  if (!session?.user) {
    return {
      ok: false,
      session: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return { ok: true, session, error: null };
}

/**
 * Require an authenticated user with hasAccess (hiring manager or admin).
 */
export async function requireAccess(): Promise<AuthResult> {
  const session = await auth();
  if (!session?.user) {
    return {
      ok: false,
      session: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  if (!session.user.hasAccess) {
    return {
      ok: false,
      session: null,
      error: NextResponse.json({ error: 'Forbidden - App access required' }, { status: 403 }),
    };
  }
  return { ok: true, session, error: null };
}

/**
 * Require an authenticated admin user.
 */
export async function requireAdmin(): Promise<AuthResult> {
  const session = await auth();
  if (!session?.user) {
    return {
      ok: false,
      session: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  if (!session.user.isAdmin) {
    return {
      ok: false,
      session: null,
      error: NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 }),
    };
  }
  return { ok: true, session, error: null };
}

// ---------------------------------------------------------------------------
// Shared route param type — used by all [id] API routes
// ---------------------------------------------------------------------------

export interface RouteParams<T extends string = 'id'> {
  params: Promise<Record<T, string>>;
}

// ---------------------------------------------------------------------------
// Application access guard — UUID + auth + fetch + optional active check
// ---------------------------------------------------------------------------

export type AppAccessSuccess = {
  ok: true;
  session: Session;
  application: ApplicationDetail;
  error: null;
};

export type AppAccessResult =
  | AppAccessSuccess
  | { ok: false; session: null; application: null; error: NextResponse };

/**
 * Common preamble for application API routes.
 * Validates UUID, authenticates, fetches the application, and optionally
 * checks that it is active — returning an early `NextResponse` on failure.
 */
export async function requireApplicationAccess(
  params: Promise<{ id: string }>,
  options: { level?: 'access' | 'admin'; requireActive?: boolean } = {},
): Promise<AppAccessResult> {
  const { level = 'access', requireActive = false } = options;
  const { id } = await params;

  if (!isValidUUID(id)) {
    return fail(NextResponse.json({ error: 'Invalid application ID format' }, { status: 400 }));
  }

  const authResult = level === 'admin' ? await requireAdmin() : await requireAccess();
  if (!authResult.ok) {
    return fail(authResult.error);
  }

  const application = await getApplicationDetail(id);
  if (!application) {
    return fail(NextResponse.json({ error: 'Application not found' }, { status: 404 }));
  }

  if (requireActive && application.status !== 'ACTIVE') {
    return fail(NextResponse.json({ error: 'Application is not active' }, { status: 400 }));
  }

  return { ok: true, session: authResult.session, application, error: null };
}

function fail(error: NextResponse): { ok: false; session: null; application: null; error: NextResponse } {
  return { ok: false, session: null, application: null, error };
}

// ---------------------------------------------------------------------------
// JSON body parser with error handling
// ---------------------------------------------------------------------------

export type JsonBodySuccess<T> = { ok: true; body: T };
export type JsonBodyResult<T = Record<string, unknown>> =
  | JsonBodySuccess<T>
  | { ok: false; error: NextResponse };

/**
 * Parse JSON body from a request, returning a 400 `NextResponse` on failure.
 */
export async function parseJsonBody<T = Record<string, unknown>>(
  request: NextRequest,
): Promise<JsonBodyResult<T>> {
  try {
    const body = await request.json();
    return { ok: true, body: body as T };
  } catch {
    return {
      ok: false,
      error: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }),
    };
  }
}