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
import { Timeline, TimelineItem, mapActionTypeToTimelineType } from '@/components/ui/timeline';
import { strings } from '@/config';
import { Stage } from '@/lib/generated/prisma/client';
import {
  RefreshCw,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMediaQuery } from '@/hooks';
import { AttentionBreakdownPanel } from '@/components/shared/attention-breakdown';
import { MetricCard } from '@/components/shared/metric-card';

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
        <MetricCard
          label={strings.metrics.totalCandidates}
          value={isLoading ? '-' : data?.metrics.totalActiveApplications || 0}
        />

        {/* Awaiting Action — click to show breakdown */}
        <MetricCard
          label={strings.metrics.awaitingAction}
          value={isLoading ? '-' : data?.metrics.awaitingAction || 0}
          asButton
          onClick={() => setShowBreakdown(true)}
          disabled={!data || data.metrics.awaitingAction === 0}
        />

        <MetricCard
          label={strings.metrics.thisWeek}
          value={isLoading ? '-' : data?.metrics.applicationsThisWeek || 0}
        />
        <MetricCard
          label={strings.interview.pending}
          value={isLoading ? '-' : data?.metrics.pendingInterviews || 0}
        />

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
      {data && (
        <AttentionBreakdownPanel
          breakdown={{ ...data.metrics.breakdown, total: data.metrics.awaitingAction }}
          open={showBreakdown}
          onOpenChange={setShowBreakdown}
          isDesktop={isDesktop}
          action={{
            label: 'View in Candidates',
            href: '/candidates',
            onClick: () => setShowBreakdown(false),
          }}
        />
      )}

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
