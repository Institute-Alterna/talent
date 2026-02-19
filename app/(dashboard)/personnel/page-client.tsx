'use client';

/**
 * Personnel Page Client Component
 *
 * Handles interactive features like search, sync, and user management.
 * Shows the complete personnel roster from Okta with status and role filtering.
 */

import { useState, useMemo, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { RefreshCw, Search, AlertTriangle } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';
import { UsersTable, UserDetailDialog } from '@/components/users';
import { MetricCard } from '@/components/shared/metric-card';
import { syncFromOktaAction, fetchUsers } from './actions';
import type { UserListItem, UserStats } from '@/types/user';
import type { OktaStatus } from '@/lib/generated/prisma/client';

type StatusFilter = OktaStatus | 'ALL' | 'DISMISSED' | 'INACTIVE';
type RoleFilter = 'ALL' | 'ADMIN' | 'HIRING_MANAGER' | 'NO_ACCESS';

interface UsersPageClientProps {
  initialUsers: UserListItem[];
  initialStats: UserStats;
  currentUserId?: string;
}

export function UsersPageClient({
  initialUsers,
  initialStats,
  currentUserId,
}: UsersPageClientProps) {
  const [users, setUsers] = useState<UserListItem[]>(initialUsers);
  const [stats, setStats] = useState<UserStats>(initialStats);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [isPending, startTransition] = useTransition();
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Compute role-filtered users client-side (team is small)
  const filteredUsers = useMemo(() => {
    if (roleFilter === 'ALL') return users;
    return users.filter((u) => {
      switch (roleFilter) {
        case 'ADMIN':
          return u.isAdmin;
        case 'HIRING_MANAGER':
          return !u.isAdmin && u.hasAppAccess;
        case 'NO_ACCESS':
          return !u.hasAppAccess;
        default:
          return true;
      }
    });
  }, [users, roleFilter]);

  // Compute interviewer stats from the full users array
  const interviewerStats = useMemo(() => {
    const interviewers = users.filter((u) => u.hasAppAccess);
    const withLink = interviewers.filter((u) => u.schedulingLink);
    const withoutLink = interviewers.filter((u) => !u.schedulingLink);
    return {
      ready: withLink.length,
      missingLink: withoutLink.length,
    };
  }, [users]);

  /** Shared fetch-and-update for users + stats. */
  const refreshUsers = async (overrideStatus?: StatusFilter) => {
    const result = await fetchUsers({
      search: searchQuery || undefined,
      oktaStatus: overrideStatus ?? statusFilter,
    });
    if (result.success && result.data) {
      setUsers(result.data.users);
      setStats(result.data.stats);
    }
  };

  const handleSearch = (newStatusFilter?: StatusFilter) => {
    startTransition(() => refreshUsers(newStatusFilter));
  };

  const handleStatusFilterChange = (newFilter: StatusFilter) => {
    setStatusFilter(newFilter);
    handleSearch(newFilter);
  };

  const handleSync = () => {
    setIsSyncing(true);
    startTransition(async () => {
      const result = await syncFromOktaAction();
      if (result.success && result.data) {
        // Refresh user list after sync
        await refreshUsers();
        // Show success message with counts
        let message = `Sync completed: ${result.data.synced} users synced, ${result.data.removed} removed`;
        if (result.data.seedDataCleaned) {
          message += '\n\n✨ Sample data has been cleaned up - app is now production-ready!';
        }
        console.log(message);
      } else {
        console.error('Sync failed:', result.error);
        // Display error to user (could add toast here)
        alert(`Sync failed: ${result.error}`);
      }
      setIsSyncing(false);
    });
  };

  const handleViewUser = (user: UserListItem) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      // Refresh users when dialog closes in case of updates
      startTransition(() => refreshUsers());
    }
  };

  return (
    <div className="space-y-4">
      {/* Compact Stats Row */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        <MetricCard label="Total" value={stats.total} />
        <MetricCard label="Active" value={stats.active} />
        <MetricCard label="Inactive" value={stats.inactive} />
        <MetricCard label="Admins" value={stats.admins} />
        <MetricCard label="Interviewers" value={interviewerStats.ready}>
          {interviewerStats.missingLink > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 cursor-help">
                    <AlertTriangle className="h-3 w-3" />
                    {interviewerStats.missingLink}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{interviewerStats.missingLink} user{interviewerStats.missingLink !== 1 ? 's' : ''} without a scheduling link</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </MetricCard>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
        {/* Search — full width on mobile */}
        <div className="w-full sm:flex-1 sm:min-w-[180px] sm:max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search personnel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Filter buttons row */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(value) => handleStatusFilterChange(value as StatusFilter)}
          >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
              <SelectItem value="DISMISSED">Dismissed</SelectItem>
            </SelectContent>
          </Select>

          {/* Role Filter */}
          <Select
            value={roleFilter}
            onValueChange={(value) => setRoleFilter(value as RoleFilter)}
          >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Roles</SelectItem>
              <SelectItem value="ADMIN">Administrators</SelectItem>
              <SelectItem value="HIRING_MANAGER">Hiring Managers</SelectItem>
              <SelectItem value="NO_ACCESS">No Access</SelectItem>
            </SelectContent>
          </Select>

          {/* Sync / Refresh */}
          <Button
            variant="outline"
            className="h-9"
            onClick={handleSync}
            disabled={isSyncing || isPending}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          </Button>

          {/* Last synced timestamp */}
          {stats.lastSyncedAt && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Synced {formatDateTime(stats.lastSyncedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Personnel Table */}
      <div className="rounded-lg border overflow-hidden">
        <UsersTable
          users={filteredUsers}
          currentUserId={currentUserId}
          onViewUser={handleViewUser}
        />
      </div>

      {/* User Detail Dialog */}
      <UserDetailDialog
        user={selectedUser}
        isCurrentUser={selectedUser?.id === currentUserId}
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
      />
    </div>
  );
}
