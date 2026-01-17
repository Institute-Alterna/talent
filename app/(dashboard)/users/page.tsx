/**
 * Users Page (Admin Only)
 *
 * Page for managing system users (Alterna personnel).
 * Only accessible to administrators.
 *
 * This is a placeholder that will be fully implemented in Phase 5.
 */

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { strings } from '@/config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, UserPlus } from 'lucide-react';

export const metadata = {
  title: 'Users',
};

export default async function UsersPage() {
  const session = await auth();

  // Check admin permission
  if (!session?.user?.isAdmin) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{strings.users.title}</h1>
          <p className="text-muted-foreground">
            Manage system users and permissions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled>
            <RefreshCw className="mr-2 h-4 w-4" />
            {strings.users.syncFromOkta}
          </Button>
          <Button disabled>
            <UserPlus className="mr-2 h-4 w-4" />
            {strings.users.addUser}
          </Button>
        </div>
      </div>

      {/* User Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Registered in system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Administrators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <Badge variant="secondary" className="mt-1">
              Full access
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Hiring Managers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <Badge variant="outline" className="mt-1">
              Limited access
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Users Table Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            Users synced from Okta with their roles and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium">No users loaded</p>
              <p className="mt-1 text-sm">
                Users are synced automatically when they sign in via Okta.
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                Full implementation coming in Phase 5
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
