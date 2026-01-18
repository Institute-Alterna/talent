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
import { strings } from '@/config';
import { makeAdminAction, revokeAdminAction, deleteUserAction, grantAppAccessAction, revokeAppAccessAction } from '@/app/(dashboard)/users/actions';
import type { UserListItem } from '@/types/user';
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

  const handleMakeAdminClick = (user: UserListItem) => {
    setSelectedUser(user);
    setConfirmDialogType('makeAdmin');
  };

  const handleMakeAdminConfirm = () => {
    if (!selectedUser) return;

    startTransition(async () => {
      const result = await makeAdminAction(selectedUser.id);
      if (result.success && result.data?.user) {
        updateLocalUser(result.data.user);
      } else {
        console.error('Failed to make admin:', result.error);
      }
      setConfirmDialogType(null);
      setSelectedUser(null);
    });
  };

  const handleRevokeAdminClick = (user: UserListItem) => {
    setSelectedUser(user);
    setConfirmDialogType('revokeAdmin');
  };

  const handleRevokeAdminConfirm = () => {
    if (!selectedUser) return;

    startTransition(async () => {
      const result = await revokeAdminAction(selectedUser.id);
      if (result.success && result.data?.user) {
        updateLocalUser(result.data.user);
      } else {
        console.error('Failed to revoke admin:', result.error);
      }
      setConfirmDialogType(null);
      setSelectedUser(null);
    });
  };

  const handleGrantAccessClick = (user: UserListItem) => {
    setSelectedUser(user);
    setConfirmDialogType('grantAccess');
  };

  const handleGrantAccessConfirm = () => {
    if (!selectedUser) return;

    startTransition(async () => {
      const result = await grantAppAccessAction(selectedUser.id);
      if (result.success && result.data?.user) {
        updateLocalUser(result.data.user);
      } else {
        console.error('Failed to grant access:', result.error);
      }
      setConfirmDialogType(null);
      setSelectedUser(null);
    });
  };

  const handleRevokeAccessClick = (user: UserListItem) => {
    setSelectedUser(user);
    setConfirmDialogType('revokeAccess');
  };

  const handleRevokeAccessConfirm = () => {
    if (!selectedUser) return;

    startTransition(async () => {
      const result = await revokeAppAccessAction(selectedUser.id);
      if (result.success && result.data?.user) {
        updateLocalUser(result.data.user);
      } else {
        console.error('Failed to revoke access:', result.error);
      }
      setConfirmDialogType(null);
      setSelectedUser(null);
    });
  };

  const handleDeleteClick = (user: UserListItem) => {
    setSelectedUser(user);
    setConfirmDialogType('delete');
  };

  const handleDeleteConfirm = () => {
    if (!selectedUser) return;

    startTransition(async () => {
      const result = await deleteUserAction(selectedUser.id);
      if (result.success) {
        // Remove deleted user from local state
        setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
      } else {
        console.error('Failed to delete user:', result.error);
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
          <TableRow>
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
                  {isDismissed(user) ? (
                    <Badge variant="secondary" className="gap-1">
                      <Ban className="h-3 w-3" />
                      Dismissed
                    </Badge>
                  ) : user.isAdmin ? (
                    <Badge variant="default">{strings.personnel.admin}</Badge>
                  ) : user.hasAppAccess ? (
                    <Badge variant="secondary">{strings.personnel.hiringManager}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">{strings.personnel.noAccess}</Badge>
                  )}
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
                              <DropdownMenuItem onClick={() => handleGrantAccessClick(user)}>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Grant App Access
                              </DropdownMenuItem>
                            )}
                            
                            {/* Admin management */}
                            {user.isAdmin ? (
                              <DropdownMenuItem onClick={() => handleRevokeAdminClick(user)}>
                                <ShieldOff className="mr-2 h-4 w-4" />
                                Revoke Admin Access
                              </DropdownMenuItem>
                            ) : user.hasAppAccess ? (
                              <DropdownMenuItem onClick={() => handleMakeAdminClick(user)}>
                                <Shield className="mr-2 h-4 w-4" />
                                Make Admin
                              </DropdownMenuItem>
                            ) : null}

                            {/* Revoke all access for users with access (hiring managers or admins) */}
                            {(user.hasAppAccess || user.isAdmin) && (
                              <DropdownMenuItem 
                                onClick={() => handleRevokeAccessClick(user)}
                                className="text-destructive focus:text-destructive"
                              >
                                <UserMinus className="mr-2 h-4 w-4" />
                                Revoke App Access
                              </DropdownMenuItem>
                            )}
                            
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteClick(user)}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={confirmDialogType === 'delete'} onOpenChange={(open) => !open && handleDialogClose()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Person</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedUser ? getFullName(selectedUser) : ''}? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Make Admin Confirmation Dialog */}
      <AlertDialog open={confirmDialogType === 'makeAdmin'} onOpenChange={(open) => !open && handleDialogClose()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Make Person an Administrator</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to make {selectedUser ? getFullName(selectedUser) : ''} an administrator?
              This will add them to the talent-administration group and grant them full access to manage personnel, candidates, and system settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMakeAdminConfirm}>
              {isPending ? 'Updating...' : 'Make Admin'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Admin Confirmation Dialog */}
      <AlertDialog open={confirmDialogType === 'revokeAdmin'} onOpenChange={(open) => !open && handleDialogClose()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Administrator Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke administrator access from {selectedUser ? getFullName(selectedUser) : ''}?
              They will be removed from the talent-administration group but will retain access as a Hiring Manager.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRevokeAdminConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? 'Revoking...' : 'Revoke Admin'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Grant Access Confirmation Dialog */}
      <AlertDialog open={confirmDialogType === 'grantAccess'} onOpenChange={(open) => !open && handleDialogClose()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Grant App Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to grant {selectedUser ? getFullName(selectedUser) : ''} access to this application?
              They will be added to the talent-access group and be able to view and manage candidates.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleGrantAccessConfirm}>
              {isPending ? 'Granting Access...' : 'Grant Access'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Access Confirmation Dialog */}
      <AlertDialog open={confirmDialogType === 'revokeAccess'} onOpenChange={(open) => !open && handleDialogClose()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke App Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke all app access from {selectedUser ? getFullName(selectedUser) : ''}?
              {selectedUser?.isAdmin && ' This will remove them from both the talent-administration and talent-access groups.'}
              {!selectedUser?.isAdmin && ' This will remove them from the talent-access group.'}
              {' '}They will no longer be able to access this application.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRevokeAccessConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? 'Revoking...' : 'Revoke Access'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
