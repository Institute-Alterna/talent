'use client';

/**
 * Dashboard Page Client Component
 *
 * Displays dashboard metrics, pipeline overview, and recent activity.
 * Fetches data from the dashboard API endpoint.
 */

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Timeline, TimelineItem, mapActionTypeToTimelineType } from '@/components/ui/timeline';
import { strings } from '@/config';
import { Stage } from '@/lib/generated/prisma/client';
import {
  RefreshCw,
  ArrowRight,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMediaQuery } from '@/hooks';

// Lazy-load recharts-heavy PipelineChart — only rendered when data is available
const PipelineChart = React.lazy(() => import('@/components/dashboard/pipeline-chart').then(m => ({ default: m.PipelineChart })));

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
      pendingAgreement: number;
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


export function DashboardPageClient() {
  const { toast } = useToast();
  const [data, setData] = React.useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = React.useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');

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
    <div className="space-y-4">
      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchDashboardData} className="ml-auto h-7 text-xs">
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Compact Metrics Row — 5 columns on desktop, refresh button stretches to card height */}
      <div className="grid gap-3 grid-cols-[1fr_1fr] md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
        <div className="rounded-lg border bg-card px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{strings.metrics.totalCandidates}</span>
          <span className="text-lg font-semibold tabular-nums">
            {isLoading ? '-' : data?.metrics.totalActiveApplications || 0}
          </span>
        </div>

        {/* Awaiting Action — click to show breakdown */}
        <button
          type="button"
          className="rounded-lg border bg-card px-3 py-2 flex items-center justify-between text-left w-full cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setShowBreakdown(true)}
          disabled={!data || data.metrics.awaitingAction === 0}
        >
          <span className="text-xs text-muted-foreground">
            {strings.metrics.awaitingAction}
          </span>
          <span className="text-lg font-semibold tabular-nums">
            {isLoading ? '-' : data?.metrics.awaitingAction || 0}
          </span>
        </button>

        <div className="rounded-lg border bg-card px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{strings.metrics.thisWeek}</span>
          <span className="text-lg font-semibold tabular-nums">
            {isLoading ? '-' : data?.metrics.applicationsThisWeek || 0}
          </span>
        </div>
        <div className="rounded-lg border bg-card px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{strings.interview.pending}</span>
          <span className="text-lg font-semibold tabular-nums">
            {isLoading ? '-' : data?.metrics.pendingInterviews || 0}
          </span>
        </div>

        {/* Refresh button — stretches to full card height via grid */}
        <Button
          variant="outline"
          className="h-full px-3 col-span-2 md:col-span-1"
          onClick={fetchDashboardData}
          disabled={isLoading}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Awaiting Action breakdown — Dialog on desktop, Sheet on mobile */}
      {data && data.metrics.awaitingAction > 0 && (() => {
        const breakdownContent = (
          <div className="space-y-4">
            <div className="grid gap-3">
              {data.metrics.breakdown.awaitingGC > 0 && (
                <div className="rounded-lg border bg-card px-3 py-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Awaiting General Competencies</span>
                  <span className="text-lg font-semibold tabular-nums">{data.metrics.breakdown.awaitingGC}</span>
                </div>
              )}
              {data.metrics.breakdown.awaitingSC > 0 && (
                <div className="rounded-lg border bg-card px-3 py-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Awaiting Specialised Competencies</span>
                  <span className="text-lg font-semibold tabular-nums">{data.metrics.breakdown.awaitingSC}</span>
                </div>
              )}
              {data.metrics.breakdown.pendingInterviews > 0 && (
                <div className="rounded-lg border bg-card px-3 py-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pending Interviews</span>
                  <span className="text-lg font-semibold tabular-nums">{data.metrics.breakdown.pendingInterviews}</span>
                </div>
              )}
              {data.metrics.breakdown.pendingAgreement > 0 && (
                <div className="rounded-lg border bg-card px-3 py-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pending Agreement</span>
                  <span className="text-lg font-semibold tabular-nums">{data.metrics.breakdown.pendingAgreement}</span>
                </div>
              )}
            </div>
            <Link href="/candidates">
              <Button
                className="w-full bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-600 dark:hover:bg-amber-700"
                onClick={() => setShowBreakdown(false)}
              >
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                View in Candidates
              </Button>
            </Link>
          </div>
        );

        return isDesktop ? (
          <Dialog open={showBreakdown} onOpenChange={setShowBreakdown}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Needs Attention</DialogTitle>
                <DialogDescription>
                  {data.metrics.awaitingAction} application{data.metrics.awaitingAction !== 1 ? 's' : ''} requiring attention
                </DialogDescription>
              </DialogHeader>
              {breakdownContent}
            </DialogContent>
          </Dialog>
        ) : (
          <Sheet open={showBreakdown} onOpenChange={setShowBreakdown}>
            <SheetContent side="bottom" className="rounded-t-xl">
              <SheetHeader>
                <SheetTitle>Needs Attention</SheetTitle>
                <SheetDescription>
                  {data.metrics.awaitingAction} application{data.metrics.awaitingAction !== 1 ? 's' : ''} requiring attention
                </SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-6 pt-2">
                {breakdownContent}
              </div>
            </SheetContent>
          </Sheet>
        );
      })()}

      {/* Pipeline + Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Pipeline Overview */}
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">{strings.dashboard.pipeline}</h3>
            <Link href="/candidates">
              <Button variant="link" size="sm" className="text-primary h-auto p-0 text-xs">
                View All <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>
          {isLoading ? (
            <div className="flex h-[280px] items-center justify-center">
              <div className="h-[180px] w-[180px] animate-pulse rounded-full bg-muted" />
            </div>
          ) : (
            <React.Suspense fallback={
              <div className="flex h-[280px] items-center justify-center">
                <div className="h-[180px] w-[180px] animate-pulse rounded-full bg-muted" />
              </div>
            }>
              <PipelineChart data={data?.byStage as Record<Stage, number>} />
            </React.Suspense>
          )}
        </div>

        {/* Recent Activity */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-medium mb-3">{strings.dashboard.recentActivity}</h3>
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
            <div className="flex h-[200px] items-center justify-center text-muted-foreground text-sm">
              {strings.dashboard.noActivity}
            </div>
          )}
        </div>
      </div>

      {/* Active Positions — compact pills */}
      {data && data.positions.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-medium mb-3">Active Positions</h3>
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
        </div>
      )}
    </div>
  );
}
