'use client';

/**
 * Users Page Client Component
 *
 * Handles interactive features like search, sync, and user management.
 * Shows the complete personnel roster from Okta with status filtering.
 */

import { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Search, Users, Shield, Calendar, CheckCircle2, XCircle, Ban } from 'lucide-react';
import { strings } from '@/config';
import { UsersTable, UserDetailDialog } from '@/components/users';
import { syncFromOktaAction, fetchUsers } from './actions';
import type { UserListItem, UserStats } from '@/types/user';
import type { OktaStatus } from '@/lib/generated/prisma/client';

type StatusFilter = OktaStatus | 'ALL' | 'DISMISSED';

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
  const [isPending, startTransition] = useTransition();
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSearch = (newStatusFilter?: StatusFilter) => {
    const filterToUse = newStatusFilter ?? statusFilter;
    startTransition(async () => {
      const result = await fetchUsers({
        search: searchQuery || undefined,
        oktaStatus: filterToUse,
      });
      if (result.success && result.data) {
        setUsers(result.data.users);
        setStats(result.data.stats);
      }
    });
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
        const fetchResult = await fetchUsers({ oktaStatus: statusFilter });
        if (fetchResult.success && fetchResult.data) {
          setUsers(fetchResult.data.users);
          setStats(fetchResult.data.stats);
        }
        // Show success message with counts
        console.log(`Sync completed: ${result.data.synced} users synced, ${result.data.removed} removed`);
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
      startTransition(async () => {
        const result = await fetchUsers({
          search: searchQuery || undefined,
          oktaStatus: statusFilter,
        });
        if (result.success && result.data) {
          setUsers(result.data.users);
          setStats(result.data.stats);
        }
      });
    }
  };

  return (
    <>
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Personnel</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">In Okta directory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{stats.inactive}</div>
            <p className="text-xs text-muted-foreground">Suspended/deprovisioned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administrators</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.admins}</div>
            <Badge variant="secondary" className="mt-1">
              Full access
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Can Interview</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withSchedulingLink}</div>
            <p className="text-xs text-muted-foreground">Have scheduling link</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={statusFilter === 'ALL' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleStatusFilterChange('ALL')}
          disabled={isPending}
        >
          All ({stats.total})
        </Button>
        <Button
          variant={statusFilter === 'ACTIVE' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleStatusFilterChange('ACTIVE')}
          disabled={isPending}
          className={statusFilter === 'ACTIVE' ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Active ({stats.active})
        </Button>
        <Button
          variant={statusFilter === 'SUSPENDED' ? 'destructive' : 'outline'}
          size="sm"
          onClick={() => handleStatusFilterChange('SUSPENDED')}
          disabled={isPending}
        >
          <XCircle className="mr-1 h-3 w-3" />
          Suspended
        </Button>
        <Button
          variant={statusFilter === 'DISMISSED' ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => handleStatusFilterChange('DISMISSED')}
          disabled={isPending}
        >
          <Ban className="mr-1 h-3 w-3" />
          Dismissed ({stats.dismissed})
        </Button>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search personnel..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
            />
          </div>
          <Button variant="outline" onClick={() => handleSearch()} disabled={isPending}>
            Search
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {stats.lastSyncedAt && (
            <span className="text-sm text-muted-foreground">
              Last synced: {new Date(stats.lastSyncedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
          <Button onClick={handleSync} disabled={isSyncing || isPending}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : strings.users.syncFromOkta}
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Personnel Roster</CardTitle>
          <CardDescription>
            Complete list of Alterna personnel synced from Okta directory
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UsersTable
            users={users}
            currentUserId={currentUserId}
            onViewUser={handleViewUser}
          />
        </CardContent>
      </Card>

      {/* User Detail Dialog */}
      <UserDetailDialog
        user={selectedUser}
        isCurrentUser={selectedUser?.id === currentUserId}
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
      />
    </>
  );
}
