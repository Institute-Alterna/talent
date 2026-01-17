/**
 * Dashboard Page
 *
 * Main dashboard showing overview of the talent pipeline.
 * Displays metrics, recent activity, and quick access to key functions.
 */

import { auth } from '@/lib/auth';
import { strings } from '@/config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = {
  title: 'Dashboard',
};

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{strings.dashboard.title}</h1>
        <p className="text-muted-foreground">
          {strings.dashboard.welcome}, {user?.name || user?.email}
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {strings.metrics.totalCandidates}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Active in pipeline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {strings.metrics.awaitingAction}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {strings.metrics.thisWeek}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">New applications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {strings.interview.pending}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Interviews scheduled</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Pipeline Overview */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>{strings.dashboard.pipeline}</CardTitle>
            <CardDescription>
              Candidates by stage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-[200px] items-center justify-center text-muted-foreground">
              Pipeline visualization coming in Phase 6
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{strings.dashboard.recentActivity}</CardTitle>
            <CardDescription>
              Latest updates in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-[200px] items-center justify-center text-muted-foreground">
              {strings.dashboard.noActivity}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Development Status - Temporary */}
      <Card>
        <CardHeader>
          <CardTitle>Development Status</CardTitle>
          <CardDescription>Current implementation progress</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className="text-green-500">&#10003;</span>
              Phase 1: Project Foundation
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">&#10003;</span>
              Phase 2: Database Setup
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">&#10003;</span>
              Phase 3: Authentication with Okta
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">&#10003;</span>
              Phase 4: Core Layout &amp; Navigation
            </li>
            <li className="flex items-center gap-2">
              <span className="text-yellow-500">&#9679;</span>
              Phase 5: User Management
            </li>
            <li className="flex items-center gap-2">
              <span className="text-zinc-400">&#9675;</span>
              Phase 6: Candidate Pipeline
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
