'use client';

/**
 * Delete Application Dialog Component
 *
 * Confirmation dialog for permanently deleting an application.
 * All related data (assessments, interviews, decisions) is removed.
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
import { strings } from '@/config';
import { AlertTriangle, Trash2, Loader2 } from 'lucide-react';

export interface WithdrawDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDelete: () => Promise<void>;
  applicationName: string;
  isProcessing?: boolean;
}

export function WithdrawDialog({
  isOpen,
  onClose,
  onDelete,
  applicationName,
  isProcessing = false,
}: WithdrawDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isProcessing) {
      onClose();
    }
  };

  const busy = isProcessing || isDeleting;

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {strings.withdraw.title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {strings.withdraw.description.replace('{name}', applicationName)}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <p className="text-sm text-destructive font-medium px-1">
          {strings.withdraw.deleteWarning}
        </p>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>
            {strings.actions.cancel}
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            {strings.withdraw.deleteAction}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

