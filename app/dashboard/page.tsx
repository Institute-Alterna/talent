/**
 * Dashboard Page
 *
 * Main dashboard for the talent management system.
 * Requires authentication - unauthenticated users are redirected to login.
 *
 * This is a placeholder that will be expanded in Phase 4.
 */

import { redirect } from 'next/navigation';
import { auth, signOut } from '@/lib/auth';
import { branding, strings } from '@/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function DashboardPage() {
  const session = await auth();

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect('/');
  }

  const { user } = session;

  return (
    <div className="min-h-screen bg-zinc-50 p-8 dark:bg-zinc-950">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{strings.dashboard.title}</h1>
            <p className="text-muted-foreground">
              {strings.dashboard.welcome}, {user.name || user.email}
            </p>
          </div>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/' });
            }}
          >
            <Button type="submit" variant="outline">
              Sign Out
            </Button>
          </form>
        </div>

        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
            <CardDescription>Logged in via Okta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="font-medium">Name:</span>
              <span>{user.name}</span>
              <span className="font-medium">Email:</span>
              <span>{user.email}</span>
              <span className="font-medium">Role:</span>
              <span>{user.isAdmin ? 'Administrator' : 'Hiring Manager'}</span>
              {user.dbUserId && (
                <>
                  <span className="font-medium">Database ID:</span>
                  <span className="font-mono text-xs">{user.dbUserId}</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Placeholder Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{strings.metrics.totalCandidates}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">-</p>
              <p className="text-xs text-muted-foreground">Coming in Phase 6</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{strings.metrics.awaitingAction}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">-</p>
              <p className="text-xs text-muted-foreground">Coming in Phase 6</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{strings.dashboard.recentActivity}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">-</p>
              <p className="text-xs text-muted-foreground">Coming in Phase 6</p>
            </CardContent>
          </Card>
        </div>

        {/* Phase Status */}
        <Card>
          <CardHeader>
            <CardTitle>Development Status</CardTitle>
            <CardDescription>Current implementation progress</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              <li>✅ Phase 1: Project Foundation</li>
              <li>✅ Phase 2: Database Setup</li>
              <li>✅ Phase 3: Authentication with Okta</li>
              <li>🔜 Phase 4: Core Layout & Navigation</li>
              <li>⏳ Phase 5: User Management</li>
              <li>⏳ Phase 6: Candidate Pipeline</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
