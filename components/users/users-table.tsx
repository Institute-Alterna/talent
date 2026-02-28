'use client';

/**
 * Users Table Component
 *
 * Displays a table of users with actions for admin management.
 */

import { useState, useTransition, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, Shield, ShieldOff, Trash2, Calendar, Eye, CheckCircle2, XCircle, Clock, AlertTriangle, UserPlus, UserMinus, Ban } from 'lucide-react';
import { makeAdminAction, revokeAdminAction, deleteUserAction, grantAppAccessAction, revokeAppAccessAction } from '@/app/(dashboard)/personnel/actions';
import { RoleBadge } from '@/components/shared/role-badge';
import type { UserListItem } from '@/types/user';
import type { ActionResult } from '@/types/shared';
import type { OktaStatus } from '@/lib/generated/prisma/client';

interface UsersTableProps {
  users: UserListItem[];
  currentUserId?: string;
  onViewUser?: (user: UserListItem) => void;
}

type ConfirmDialogType = 'delete' | 'makeAdmin' | 'revokeAdmin' | 'grantAccess' | 'revokeAccess' | null;

export function UsersTable({ users: initialUsers, currentUserId, onViewUser }: UsersTableProps) {
  const [isPending, startTransition] = useTransition();
  const [confirmDialogType, setConfirmDialogType] = useState<ConfirmDialogType>(null);
  const [selectedUser, setSelectedUser] = useState<UserListItem | null>(null);
  const [users, setUsers] = useState<UserListItem[]>(initialUsers);

  // Sync local state when prop changes (e.g., from tab filtering)
  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  // Update local user state after successful action
  const updateLocalUser = (updatedUser: UserListItem) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  // --- Action maps for data-driven confirm dialog ---
  const actionMap: Record<Exclude<ConfirmDialogType, null>, (id: string) => Promise<ActionResult<{ user: UserListItem } | void>>> = {
    makeAdmin: makeAdminAction,
    revokeAdmin: revokeAdminAction,
    grantAccess: grantAppAccessAction,
    revokeAccess: revokeAppAccessAction,
    delete: deleteUserAction,
  };

  const openConfirmDialog = (user: UserListItem, type: Exclude<ConfirmDialogType, null>) => {
    setSelectedUser(user);
    setConfirmDialogType(type);
  };

  const handleConfirm = () => {
    if (!selectedUser || !confirmDialogType) return;
    const action = actionMap[confirmDialogType];
    startTransition(async () => {
      const result = await action(selectedUser.id);
      if (result.success) {
        if (confirmDialogType === 'delete') {
          setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
        } else {
          const data = result.data as { user: UserListItem } | undefined;
          if (data?.user) {
            updateLocalUser(data.user);
          }
        }
      } else {
        console.error(`Action ${confirmDialogType} failed:`, result.error);
      }
      setConfirmDialogType(null);
      setSelectedUser(null);
    });
  };

  const handleDialogClose = () => {
    setConfirmDialogType(null);
    setSelectedUser(null);
  };

  const getFullName = (user: UserListItem) => {
    return `${user.firstName} ${user.lastName}`;
  };

  // Check if user is dismissed (deprovisioned in Okta)
  // Note: SUSPENDED users are NOT considered dismissed as they may be inactive collaborators
  const isDismissed = (user: UserListItem) => {
    return user.oktaStatus === 'DEPROVISIONED';
  };

  const getStatusBadge = (status: OktaStatus) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Active
          </Badge>
        );
      case 'SUSPENDED':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Suspended
          </Badge>
        );
      case 'DEPROVISIONED':
        return (
          <Badge variant="secondary" className="gap-1">
            <XCircle className="h-3 w-3" />
            Deprovisioned
          </Badge>
        );
      case 'PROVISIONED':
      case 'STAGED':
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case 'LOCKED_OUT':
      case 'PASSWORD_EXPIRED':
      case 'RECOVERY':
        return (
          <Badge variant="outline" className="gap-1 border-yellow-500 text-yellow-600">
            <AlertTriangle className="h-3 w-3" />
            {status.replace('_', ' ')}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (users.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-muted-foreground">
        <p>No personnel found</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Scheduling</TableHead>
            <TableHead className="w-[70px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const isCurrentUser = user.id === currentUserId;

            return (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{getFullName(user)}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.title || '-'}</TableCell>
                <TableCell>{getStatusBadge(user.oktaStatus)}</TableCell>
                <TableCell>
                  <RoleBadge
                    isAdmin={user.isAdmin}
                    hasAppAccess={user.hasAppAccess}
                    isDismissed={isDismissed(user)}
                  />
                </TableCell>
                <TableCell>
                  {user.schedulingLink ? (
                    <Badge variant="outline" className="gap-1">
                      <Calendar className="h-3 w-3" />
                      Set
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {isDismissed(user) ? (
                    // Dismissed users show a greyed-out prohibited icon
                    <div className="flex h-8 w-8 items-center justify-center">
                      <Ban className="h-4 w-4 text-muted-foreground/50" />
                    </div>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          disabled={isPending}
                        >
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onViewUser && (
                          <DropdownMenuItem onClick={() => onViewUser(user)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                        )}
                        {!isCurrentUser && (
                          <>
                            {/* Grant access for users without access */}
                            {!user.hasAppAccess && !user.isAdmin && (
                              <DropdownMenuItem onClick={() => openConfirmDialog(user, 'grantAccess')}>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Grant App Access
                              </DropdownMenuItem>
                            )}
                            
                            {/* Admin management */}
                            {user.isAdmin ? (
                              <DropdownMenuItem onClick={() => openConfirmDialog(user, 'revokeAdmin')}>
                                <ShieldOff className="mr-2 h-4 w-4" />
                                Revoke Admin Access
                              </DropdownMenuItem>
                            ) : user.hasAppAccess ? (
                              <DropdownMenuItem onClick={() => openConfirmDialog(user, 'makeAdmin')}>
                                <Shield className="mr-2 h-4 w-4" />
                                Make Admin
                              </DropdownMenuItem>
                            ) : null}

                            {/* Revoke all access for users with access (hiring managers or admins) */}
                            {(user.hasAppAccess || user.isAdmin) && (
                              <DropdownMenuItem 
                                onClick={() => openConfirmDialog(user, 'revokeAccess')}
                                className="text-destructive focus:text-destructive"
                              >
                                <UserMinus className="mr-2 h-4 w-4" />
                                Revoke App Access
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => openConfirmDialog(user, 'delete')}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                        {isCurrentUser && (
                          <DropdownMenuItem disabled>
                            <span className="text-muted-foreground">This is you</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Data-driven confirmation dialog */}
      {confirmDialogType && (() => {
        const userName = selectedUser ? getFullName(selectedUser) : '';
        const config: Record<Exclude<ConfirmDialogType, null>, { title: string; description: string; confirmLabel: string; pendingLabel: string; destructive: boolean }> = {
          delete: {
            title: 'Delete Person',
            description: `Are you sure you want to delete ${userName}? This action cannot be undone.`,
            confirmLabel: 'Delete',
            pendingLabel: 'Deleting...',
            destructive: true,
          },
          makeAdmin: {
            title: 'Make Person an Administrator',
            description: `Are you sure you want to make ${userName} an administrator? This will add them to the talent-administration group and grant them full access to manage personnel, candidates, and system settings.`,
            confirmLabel: 'Make Admin',
            pendingLabel: 'Updating...',
            destructive: false,
          },
          revokeAdmin: {
            title: 'Revoke Administrator Access',
            description: `Are you sure you want to revoke administrator access from ${userName}? They will be removed from the talent-administration group but will retain access as a Hiring Manager.`,
            confirmLabel: 'Revoke Admin',
            pendingLabel: 'Revoking...',
            destructive: true,
          },
          grantAccess: {
            title: 'Grant App Access',
            description: `Are you sure you want to grant ${userName} access to this application? They will be added to the talent-access group and be able to view and manage candidates.`,
            confirmLabel: 'Grant Access',
            pendingLabel: 'Granting Access...',
            destructive: false,
          },
          revokeAccess: {
            title: 'Revoke App Access',
            description: `Are you sure you want to revoke all app access from ${userName}?${selectedUser?.isAdmin ? ' This will remove them from both the talent-administration and talent-access groups.' : ' This will remove them from the talent-access group.'} They will no longer be able to access this application.`,
            confirmLabel: 'Revoke Access',
            pendingLabel: 'Revoking...',
            destructive: true,
          },
        };
        const c = config[confirmDialogType];
        return (
          <AlertDialog open onOpenChange={(open) => !open && handleDialogClose()}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{c.title}</AlertDialogTitle>
                <AlertDialogDescription>{c.description}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleConfirm}
                  className={c.destructive ? 'bg-destructive text-white hover:bg-destructive/85' : undefined}
                >
                  {isPending ? c.pendingLabel : c.confirmLabel}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        );
      })()}
    </>
  );
}
