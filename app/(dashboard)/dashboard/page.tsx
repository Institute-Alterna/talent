/**
 * Dashboard Page
 *
 * Main dashboard showing overview of the talent pipeline.
 * Displays metrics, recent activity, and quick access to key functions.
 */

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardPageClient } from './page-client';

export const metadata = {
  title: 'Dashboard',
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/api/auth/signin');
  }

  if (!session.user.hasAccess) {
    redirect('/auth/error?error=AccessDenied');
  }

  // Get display name: prefer firstName, then displayName, then name
  const displayName = session.user.firstName || session.user.displayName || session.user.name || 'there';

  return <DashboardPageClient displayName={displayName} />;
}
