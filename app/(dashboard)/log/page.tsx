/**
 * Audit Log Page (Server Component)
 *
 * Displays complete audit history with pagination and filtering.
 * Admin-only access - non-admins are redirected.
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { AuditLogPageClient } from './page-client';

export const metadata = {
  title: 'Audit Log | Alterna Talent',
  description: 'View complete audit history of system activity',
};

export default async function AuditLogPage() {
  const session = await auth();

  // Redirect if not authenticated
  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Redirect non-admins
  if (!session.user.isAdmin) {
    redirect('/dashboard');
  }

  return <AuditLogPageClient />;
}
