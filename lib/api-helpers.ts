import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import type { Session } from 'next-auth';

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
