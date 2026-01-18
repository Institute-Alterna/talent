/**
 * Users Page (Admin Only)
 *
 * Page for managing system users (Alterna personnel).
 * Only accessible to administrators.
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { strings } from '@/config';
import { getUsers, getUserStats } from '@/lib/services/users';
import { UsersPageClient } from './page-client';

export const metadata = {
  title: 'Users',
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
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{strings.users.title}</h1>
        <p className="text-muted-foreground">
          Manage system users and permissions
        </p>
      </div>

      {/* Client Component with Interactive Features */}
      <UsersPageClient
        initialUsers={users}
        initialStats={stats}
        currentUserId={session.user.dbUserId}
      />
    </div>
  );
}
