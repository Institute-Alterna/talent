'use client';

/**
 * GC Overdue Rejection Dialog Component
 *
 * Confirmation dialog for rejecting applications in the GENERAL_COMPETENCIES
 * stage where the candidate did not submit the assessment within 7 days.
 * Triggered from the inline reject button on the pipeline card.
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
import { XCircle, Loader2 } from 'lucide-react';

export interface GcRejectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  applicationName: string;
}

export function GcRejectionDialog({
  isOpen,
  onClose,
  onConfirm,
  applicationName,
}: GcRejectionDialogProps) {
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsProcessing(false);
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
            <XCircle className="h-5 w-5 text-destructive" />
            {strings.gcRejection.dialogTitle}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {strings.gcRejection.dialogDescription.replace('{name}', applicationName)}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <p className="text-sm text-destructive font-medium px-1">
          {strings.gcRejection.dialogWarning}
        </p>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>
            {strings.actions.cancel}
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            {strings.gcRejection.confirmAction}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
