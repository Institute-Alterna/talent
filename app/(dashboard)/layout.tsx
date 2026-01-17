/**
 * Dashboard Group Layout
 *
 * This layout wraps all protected routes (dashboard, candidates, users, settings).
 * It provides the consistent sidebar/header layout and authentication check.
 *
 * Routes using this layout:
 * - /dashboard
 * - /candidates
 * - /users
 * - /settings
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { DashboardLayout } from '@/components/layout';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect('/');
  }

  const user = {
    name: session.user.name,
    email: session.user.email,
    isAdmin: session.user.isAdmin,
  };

  return <DashboardLayout user={user}>{children}</DashboardLayout>;
}
