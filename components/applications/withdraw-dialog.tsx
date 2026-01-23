'use client';

/**
 * Withdraw Dialog Component
 *
 * Confirmation dialog for withdrawing or deleting an application.
 * Provides two options:
 * 1. Deny Application - Sets status to WITHDRAWN, sends rejection email
 * 2. Delete Entirely - Hard deletes from database (for test applications)
 */

import * as React from 'react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { strings } from '@/config';
import { AlertTriangle, Ban, Trash2, Loader2 } from 'lucide-react';

export interface WithdrawDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDeny: () => Promise<void>;
  onDelete: () => Promise<void>;
  applicationName: string;
  isProcessing?: boolean;
}

export function WithdrawDialog({
  isOpen,
  onClose,
  onDeny,
  onDelete,
  applicationName,
  isProcessing = false,
}: WithdrawDialogProps) {
  const [action, setAction] = React.useState<'deny' | 'delete' | null>(null);

  const handleDeny = async () => {
    setAction('deny');
    try {
      await onDeny();
      onClose();
    } finally {
      setAction(null);
    }
  };

  const handleDelete = async () => {
    setAction('delete');
    try {
      await onDelete();
      onClose();
    } finally {
      setAction(null);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isProcessing) {
      onClose();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {strings.withdraw.title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {strings.withdraw.description.replace('{name}', applicationName)}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Deny Option */}
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-amber-600" />
              <span className="font-medium">{strings.withdraw.denyTitle}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {strings.withdraw.denyDescription}
            </p>
            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={handleDeny}
              disabled={isProcessing}
            >
              {action === 'deny' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Ban className="h-4 w-4 mr-2" />
              )}
              {strings.withdraw.denyAction}
            </Button>
          </div>

          <Separator />

          {/* Delete Option */}
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-destructive" />
              <span className="font-medium text-destructive">{strings.withdraw.deleteTitle}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {strings.withdraw.deleteDescription}
            </p>
            <p className="text-xs text-destructive font-medium">
              {strings.withdraw.deleteWarning}
            </p>
            <Button
              variant="destructive"
              className="w-full mt-2"
              onClick={handleDelete}
              disabled={isProcessing}
            >
              {action === 'delete' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {strings.withdraw.deleteAction}
            </Button>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>
            {strings.actions.cancel}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
