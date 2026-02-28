'use client';

/**
 * Resend Agreement Dialog Component
 *
 * Confirmation dialog for resending the offer letter email at AGREEMENT stage.
 * Features:
 * - 5-second countdown timer (auto-starts on open, no text field needed)
 * - Warning that resend should only happen at candidate's request
 * - Loading spinners during processing
 * - Error handling via useDialogSubmit
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
import { Mail, Loader2 } from 'lucide-react';
import { InlineError } from '@/components/shared/inline-error';
import { useDialogSubmit } from '@/hooks';

export interface ResendAgreementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  applicationName: string;
  isProcessing?: boolean;
}

export function ResendAgreementDialog({
  isOpen,
  onClose,
  onConfirm,
  applicationName,
  isProcessing = false,
}: ResendAgreementDialogProps) {
  const [countdown, setCountdown] = React.useState(5);

  const { isSubmitting, isDisabled, error, handleOpenChange, handleConfirm } =
    useDialogSubmit({
      onConfirm: async () => { onConfirm(); },
      onClose,
      isProcessing,
    });

  // Reset countdown when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setCountdown(5);
    }
  }, [isOpen]);

  // Auto-start countdown on open
  React.useEffect(() => {
    if (!isOpen || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, countdown]);

  const isCountdownActive = countdown > 0;

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            {strings.resendAgreement.title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {strings.resendAgreement.description.replace('{name}', applicationName)}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 pb-2">
          <InlineError message={error} />

          <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 rounded-md px-3 py-2">
            {strings.resendAgreement.warning}
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDisabled}>
            {strings.actions.cancel}
          </AlertDialogCancel>
          <Button
            onClick={handleConfirm}
            disabled={isDisabled || isCountdownActive}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Mail className="h-4 w-4 mr-2" />
            )}
            {isCountdownActive
              ? `${strings.resendAgreement.confirmAction} (${countdown})`
              : strings.resendAgreement.confirmAction}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
