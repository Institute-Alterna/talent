'use client';

/**
 * Audit Log Page Client Component
 *
 * Displays complete audit history with pagination and filtering.
 * Compact layout matching candidates/personnel pages.
 */

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Timeline, TimelineItem, mapActionTypeToTimelineType } from '@/components/ui/timeline';
import { useToast } from '@/hooks/use-toast';
import { humaniseAuditAction } from '@/lib/audit-display';
import { RefreshCw, Search, Loader2 } from 'lucide-react';

const ACTION_TYPE_LABELS: Record<string, string> = {
  CREATE: 'Create',
  UPDATE: 'Update',
  DELETE: 'Delete',
  VIEW: 'View',
  EMAIL_SENT: 'Email Sent',
  STATUS_CHANGE: 'Status Change',
  STAGE_CHANGE: 'Stage Change',
};

interface AuditLogEntry {
  id: string;
  action: string;
  actionType: string;
  createdAt: string;
  details?: Record<string, unknown> | null;
  ipAddress: string | null;
  person: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  application: {
    id: string;
    position: string;
  } | null;
  user: {
    id: string;
    displayName: string;
    email: string;
  } | null;
}

interface Actor {
  id: string;
  displayName: string;
  email: string;
}

interface AuditLogsResponse {
  logs: AuditLogEntry[];
  nextCursor: string | null;
  hasMore: boolean;
  actors?: Actor[];
}

export function AuditLogPageClient() {
  const { toast } = useToast();
  const [logs, setLogs] = React.useState<AuditLogEntry[]>([]);
  const [actors, setActors] = React.useState<Actor[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [hasMore, setHasMore] = React.useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedActor, setSelectedActor] = React.useState<string>('');
  const [selectedActionType, setSelectedActionType] = React.useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');

  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch logs function
  const fetchLogs = React.useCallback(
    async (cursor?: string, append = false) => {
      try {
        if (append) {
          setIsLoadingMore(true);
        } else {
          setIsLoading(true);
          setError(null);
        }

        const params = new URLSearchParams();
        params.set('limit', '30');
        if (cursor) params.set('cursor', cursor);
        if (selectedActor) params.set('actorId', selectedActor);
        if (debouncedSearch) params.set('search', debouncedSearch);
        if (selectedActionType) params.set('actionTypes', selectedActionType);
        if (!append) params.set('includeActors', 'true');

        const response = await fetch(`/api/audit-logs?${params.toString()}`);

        if (!response.ok) {
          if (response.status === 403) {
            throw new Error('Access denied - Admin privileges required');
          }
          throw new Error('Failed to fetch audit logs');
        }

        const data: AuditLogsResponse = await response.json();

        if (append) {
          setLogs((prev) => [...prev, ...data.logs]);
        } else {
          setLogs(data.logs);
          if (data.actors) {
            setActors(data.actors);
          }
        }

        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [selectedActor, selectedActionType, debouncedSearch, toast]
  );

  // Initial fetch and refetch on filter changes
  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Handle load more
  const handleLoadMore = () => {
    if (nextCursor && hasMore && !isLoadingMore) {
      fetchLogs(nextCursor, true);
    }
  };

  // Convert logs to timeline items
  const timelineItems: TimelineItem[] = logs.map((log) => ({
    id: log.id,
    title: humaniseAuditAction(log),
    description: log.person
      ? `${log.person.firstName} ${log.person.lastName}${log.application ? ` - ${log.application.position}` : ''}`
      : log.application
        ? log.application.position
        : undefined,
    timestamp: log.createdAt,
    type: mapActionTypeToTimelineType(log.actionType),
    user: log.user ? { name: log.user.displayName, email: log.user.email } : undefined,
  }));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
        {/* Search — full width on mobile */}
        <div className="w-full sm:flex-1 sm:min-w-[180px] sm:max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search actions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Filter buttons row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Action Type Filter */}
          <Select
            value={selectedActionType || 'all'}
            onValueChange={(value) => setSelectedActionType(value === 'all' ? '' : value)}
          >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Action Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(ACTION_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Actor Filter */}
          <Select
            value={selectedActor || 'all'}
            onValueChange={(value) => setSelectedActor(value === 'all' ? '' : value)}
          >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="All Personnel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Personnel</SelectItem>
              {actors.map((actor) => (
                <SelectItem key={actor.id} value={actor.id}>
                  {actor.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Refresh */}
          <Button
            variant="outline"
            className="h-9"
            onClick={() => { setNextCursor(null); fetchLogs(); }}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" onClick={() => fetchLogs()} className="mt-4">
            Try Again
          </Button>
        </div>
      ) : timelineItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {(searchTerm || selectedActor || selectedActionType) ? 'No logs match your filters' : 'No audit logs yet'}
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-4">
          <Timeline items={timelineItems} />

          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center mt-6">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load 30 more'
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
