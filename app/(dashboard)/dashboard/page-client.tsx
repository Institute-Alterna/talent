'use client';

/**
 * Dashboard Page Client Component
 *
 * Displays dashboard metrics, pipeline overview, and recent activity.
 * Fetches data from the dashboard API endpoint.
 */

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Timeline, TimelineItem, mapActionTypeToTimelineType } from '@/components/ui/timeline';
import { StageBadge } from '@/components/applications';
import { strings } from '@/config';
import { Stage } from '@/lib/generated/prisma/client';
import {
  Users,
  Briefcase,
  Clock,
  Calendar,
  TrendingUp,
  RefreshCw,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DashboardPageClientProps {
  displayName: string;
}

interface DashboardResponse {
  metrics: {
    totalActiveApplications: number;
    totalPersons: number;
    applicationsThisWeek: number;
    pendingInterviews: number;
    awaitingAction: number;
    breakdown: {
      awaitingGC: number;
      awaitingSC: number;
      pendingInterviews: number;
    };
  };
  byStage: Record<Stage, number>;
  byStatus: Record<string, number>;
  positions: Array<{ position: string; count: number }>;
  recentActivity: Array<{
    id: string;
    action: string;
    actionType: string;
    createdAt: string;
    person?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    } | null;
    application?: {
      id: string;
      position: string;
    } | null;
    user?: {
      id: string;
      displayName: string;
    } | null;
  }>;
  generatedAt: string;
}

const STAGE_ORDER: Stage[] = [
  'APPLICATION',
  'GENERAL_COMPETENCIES',
  'SPECIALIZED_COMPETENCIES',
  'INTERVIEW',
  'AGREEMENT',
  'SIGNED',
];

export function DashboardPageClient({ displayName }: DashboardPageClientProps) {
  const { toast } = useToast();
  const [data, setData] = React.useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Use ref for toast to avoid dependency issues in useCallback
  const toastRef = React.useRef(toast);
  React.useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  const fetchDashboardData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/dashboard');
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const result: DashboardResponse = await response.json();
      setData(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toastRef.current({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Calculate total for pipeline chart
  const totalInPipeline = data
    ? Object.values(data.byStage).reduce((sum, count) => sum + count, 0)
    : 0;

  // Convert activity to timeline items
  const activityItems: TimelineItem[] = (data?.recentActivity || []).map(item => ({
    id: item.id,
    title: item.action,
    description: item.person
      ? `${item.person.firstName} ${item.person.lastName}${item.application ? ` - ${item.application.position}` : ''}`
      : undefined,
    timestamp: item.createdAt,
    type: mapActionTypeToTimelineType(item.actionType),
    user: item.user ? { name: item.user.displayName } : undefined,
  }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{strings.dashboard.title}</h1>
          <p className="text-muted-foreground">
            {strings.dashboard.welcome}, {displayName}
          </p>
        </div>
        <Button onClick={fetchDashboardData} disabled={isLoading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
              <Button variant="outline" size="sm" onClick={fetchDashboardData} className="ml-auto">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {strings.metrics.totalCandidates}
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '-' : data?.metrics.totalActiveApplications || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active in pipeline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {strings.metrics.awaitingAction}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '-' : data?.metrics.awaitingAction || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {strings.metrics.thisWeek}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '-' : data?.metrics.applicationsThisWeek || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              New applications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {strings.interview.pending}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '-' : data?.metrics.pendingInterviews || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Interviews pending
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Pipeline Overview */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{strings.dashboard.pipeline}</CardTitle>
                <CardDescription>
                  Candidates by stage
                </CardDescription>
              </div>
              <Link href="/candidates">
                <Button variant="ghost" size="sm">
                  View All <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {STAGE_ORDER.map((stage) => (
                  <div key={stage} className="animate-pulse">
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-5 bg-muted rounded w-32" />
                      <div className="h-5 bg-muted rounded w-8" />
                    </div>
                    <div className="h-2 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {STAGE_ORDER.map((stage) => {
                  const count = data?.byStage[stage] || 0;
                  const percentage = totalInPipeline > 0
                    ? (count / totalInPipeline) * 100
                    : 0;

                  return (
                    <div key={stage}>
                      <div className="flex items-center justify-between mb-2">
                        <StageBadge stage={stage} size="sm" />
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            )}
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
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted" />
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activityItems.length > 0 ? (
              <Timeline items={activityItems} maxItems={5} />
            ) : (
              <div className="flex h-[200px] items-center justify-center text-muted-foreground">
                {strings.dashboard.noActivity}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Awaiting Action Breakdown */}
      {data && data.metrics.awaitingAction > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Actions Required
            </CardTitle>
            <CardDescription>
              Applications that need your attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {data.metrics.breakdown.awaitingGC > 0 && (
                <div className="border rounded-lg p-4">
                  <div className="text-2xl font-bold">{data.metrics.breakdown.awaitingGC}</div>
                  <p className="text-sm text-muted-foreground">Awaiting General Competencies</p>
                </div>
              )}
              {data.metrics.breakdown.awaitingSC > 0 && (
                <div className="border rounded-lg p-4">
                  <div className="text-2xl font-bold">{data.metrics.breakdown.awaitingSC}</div>
                  <p className="text-sm text-muted-foreground">Awaiting Specialized Assessment</p>
                </div>
              )}
              {data.metrics.breakdown.pendingInterviews > 0 && (
                <div className="border rounded-lg p-4">
                  <div className="text-2xl font-bold">{data.metrics.breakdown.pendingInterviews}</div>
                  <p className="text-sm text-muted-foreground">Pending Interviews</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Positions */}
      {data && data.positions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Positions</CardTitle>
            <CardDescription>
              Positions with active applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.positions.map((pos) => (
                <div
                  key={pos.position}
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
                >
                  <span>{pos.position}</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {pos.count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
