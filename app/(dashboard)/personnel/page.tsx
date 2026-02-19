/**
 * Personnel Page (Admin Only)
 *
 * Page for managing system personnel (Alterna staff).
 * Only accessible to administrators.
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getUsers, getUserStats } from '@/lib/services/users';
import { UsersPageClient } from './page-client';

export const metadata = {
  title: 'Personnel',
};

export default async function UsersPage() {
  const session = await auth();

  // Check admin permission
  if (!session?.user?.isAdmin) {
    redirect('/dashboard');
  }

  // Fetch initial data
  const [users, stats] = await Promise.all([
    getUsers(),
    getUserStats(),
  ]);

  return (
    <UsersPageClient
      initialUsers={users}
      initialStats={stats}
      currentUserId={session.user.dbUserId}
    />
  );
}
