'use client';

/**
 * User Detail Dialog Component
 *
 * Modal dialog for viewing and editing user details.
 */

import { useState, useTransition, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { strings } from '@/config';
import { formatDateTime } from '@/lib/utils';
import { RoleBadge } from '@/components/shared/role-badge';
import { updateUserAction, fetchUser } from '@/app/(dashboard)/personnel/actions';
import type { UserListItem, User } from '@/types/user';

interface UserDetailDialogProps {
  user: UserListItem | null;
  isCurrentUser?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserDetailDialog({
  user,
  isCurrentUser,
  open,
  onOpenChange,
}: UserDetailDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [fullUser, setFullUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    displayName: '',
    title: '',
    schedulingLink: '',
    isAdmin: false,
  });

  // Fetch full user data when dialog opens
  useEffect(() => {
    if (open && user) {
      startTransition(async () => {
        const result = await fetchUser(user.id);
        if (result.success && result.data?.user) {
          setFullUser(result.data.user);
          setFormData({
            displayName: result.data.user.displayName,
            title: result.data.user.title || '',
            schedulingLink: result.data.user.schedulingLink || '',
            isAdmin: result.data.user.isAdmin,
          });
        }
      });
    }
  }, [open, user]);

  const handleSave = () => {
    if (!user) return;

    startTransition(async () => {
      const result = await updateUserAction(user.id, {
        displayName: formData.displayName,
        title: formData.title || null,
        schedulingLink: formData.schedulingLink || null,
        isAdmin: isCurrentUser ? undefined : formData.isAdmin,
      });

      if (result.success) {
        setIsEditing(false);
        onOpenChange(false);
      } else {
        console.error('Failed to update user:', result.error);
      }
    });
  };

  const handleClose = () => {
    setIsEditing(false);
    onOpenChange(false);
  };

  // Use shared `formatDateTime` helper from '@/lib/utils' for consistent formatting


  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Details' : 'Personnel Details'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update profile information below.'
              : 'View profile information.'}
          </DialogDescription>
        </DialogHeader>

        {isPending && !fullUser ? (
          <div className="flex h-[200px] items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : isEditing ? (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={formData.displayName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, displayName: e.target.value }))
                }
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="e.g., Senior Developer"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="schedulingLink">Scheduling Link</Label>
              {user.hasAppAccess ? (
                <Input
                  id="schedulingLink"
                  type="url"
                  value={formData.schedulingLink}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, schedulingLink: e.target.value }))
                  }
                  placeholder="https://cal.com/username"
                />
              ) : (
                <p className="text-sm text-muted-foreground rounded-md border border-dashed p-3">
                  {strings.personnel.schedulingLinkNoAccess}
                </p>
              )}
            </div>

            {!isCurrentUser && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="isAdmin">Administrator</Label>
                  <p className="text-sm text-muted-foreground">
                    Grant full system access
                  </p>
                </div>
                <Switch
                  id="isAdmin"
                  checked={formData.isAdmin}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, isAdmin: checked }))
                  }
                />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{fullUser ? `${fullUser.firstName} ${fullUser.lastName}` : `${user.firstName} ${user.lastName}`}</h3>
                <p className="text-sm text-muted-foreground">{fullUser?.email || user.email}</p>
              </div>
              <RoleBadge
                isAdmin={fullUser?.isAdmin ?? user.isAdmin}
                hasAppAccess={user.hasAppAccess}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">First Name</p>
                <p className="font-medium">{fullUser?.firstName || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Name</p>
                <p className="font-medium">{fullUser?.lastName || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Title</p>
                <p className="font-medium">{fullUser?.title || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Clearance</p>
                <p className="font-medium">{fullUser?.operationalClearance || '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Scheduling Link</p>
                {fullUser?.schedulingLink ? (
                  <a
                    href={fullUser.schedulingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    {fullUser.schedulingLink}
                  </a>
                ) : (
                  <p className="font-medium">-</p>
                )}
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Timezone</p>
                <p className="font-medium">{fullUser?.timezone || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Language</p>
                <p className="font-medium">{fullUser?.preferredLanguage?.toUpperCase() || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">{formatDateTime(fullUser?.createdAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Synced</p>
                <p className="font-medium">{formatDateTime(fullUser?.lastSyncedAt)}</p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isPending}>
                {isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
