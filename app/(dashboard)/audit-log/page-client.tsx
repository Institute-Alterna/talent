'use client';

/**
 * Audit Log Page Client Component
 *
 * Displays complete audit history with pagination and filtering.
 * Features:
 * - Cursor-based pagination ("Load 30 more" button)
 * - Filter by actor (user who performed actions)
 * - Search by action text
 * - Shows all action types including VIEW
 */

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { strings } from '@/config';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Search, Filter, Loader2 } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  action: string;
  actionType: string;
  createdAt: string;
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
    [selectedActor, debouncedSearch, toast]
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

  // Handle refresh
  const handleRefresh = () => {
    setNextCursor(null);
    fetchLogs();
  };

  // Handle filter reset
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedActor('');
  };

  // Convert logs to timeline items
  const timelineItems: TimelineItem[] = logs.map((log) => ({
    id: log.id,
    title: log.action,
    description: log.person
      ? `${log.person.firstName} ${log.person.lastName}${log.application ? ` - ${log.application.position}` : ''}`
      : log.application
        ? log.application.position
        : undefined,
    timestamp: log.createdAt,
    type: mapActionTypeToTimelineType(log.actionType),
    user: log.user ? { name: log.user.displayName, email: log.user.email } : undefined,
  }));

  const hasActiveFilters = searchTerm || selectedActor;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{strings.auditLog.title}</h1>
          <p className="text-muted-foreground">{strings.auditLog.description}</p>
        </div>
        <Button onClick={handleRefresh} disabled={isLoading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search actions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Actor filter */}
            <Select
              value={selectedActor || 'all'}
              onValueChange={(value) => setSelectedActor(value === 'all' ? '' : value)}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder={strings.auditLog.filterByActor} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{strings.auditLog.allActors}</SelectItem>
                {actors.map((actor) => (
                  <SelectItem key={actor.id} value={actor.id}>
                    {actor.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Reset filters */}
            {hasActiveFilters && (
              <Button variant="ghost" onClick={handleResetFilters}>
                Clear filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Activity History</CardTitle>
          <CardDescription>
            {logs.length > 0
              ? `Showing ${logs.length} log${logs.length !== 1 ? 's' : ''}${hasMore ? ' (more available)' : ''}`
              : 'No logs found'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive">{error}</p>
              <Button variant="outline" onClick={handleRefresh} className="mt-4">
                Try Again
              </Button>
            </div>
          ) : timelineItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {hasActiveFilters ? 'No logs match your filters' : 'No audit logs yet'}
            </div>
          ) : (
            <>
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
