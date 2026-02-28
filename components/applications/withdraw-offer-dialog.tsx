'use client';

/**
 * Withdraw Offer Dialog Component
 *
 * Confirmation dialog for withdrawing an accepted offer at AGREEMENT stage.
 * Features:
 * - Required reason field
 * - Send email checkbox
 * - 5-second countdown timer to prevent accidental confirmation
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { strings } from '@/config';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { InlineError } from '@/components/shared/inline-error';
import { useDialogSubmit } from '@/hooks';

export interface WithdrawOfferDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { reason: string; sendEmail: boolean }) => Promise<void>;
  applicationName: string;
  isProcessing?: boolean;
}

export function WithdrawOfferDialog({
  isOpen,
  onClose,
  onConfirm,
  applicationName,
  isProcessing = false,
}: WithdrawOfferDialogProps) {
  const [reason, setReason] = React.useState('');
  const [sendEmail, setSendEmail] = React.useState(true);
  const [countdown, setCountdown] = React.useState(5);
  const [countdownStarted, setCountdownStarted] = React.useState(false);

  const { isSubmitting, isDisabled, error, handleOpenChange, handleConfirm } =
    useDialogSubmit({
      onConfirm: () =>
        onConfirm({
          reason: reason.trim(),
          sendEmail,
        }),
      onClose,
      isProcessing,
      validate: () =>
        !reason.trim()
          ? strings.withdrawOffer.reasonRequired
          : null,
    });

  // Reset form and countdown when dialog opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setReason('');
      setSendEmail(true);
      setCountdown(5);
      setCountdownStarted(false);
    }
  }, [isOpen]);

  // Start countdown when reason becomes non-empty for the first time
  React.useEffect(() => {
    if (!countdownStarted && reason.trim().length > 0) {
      setCountdownStarted(true);
      setCountdown(5);
    }
  }, [reason, countdownStarted]);

  // Countdown timer — only runs after started
  React.useEffect(() => {
    if (!isOpen || !countdownStarted || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, countdownStarted, countdown]);

  const isCountdownActive = !countdownStarted || countdown > 0;

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            {strings.withdrawOffer.title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {strings.withdrawOffer.description.replace('{name}', applicationName)}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 pb-4">
          {/* Error message */}
          <InlineError message={error} />

          {/* Warning */}
          <p className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">
            {strings.withdrawOffer.warning}
          </p>

          {/* Reason field */}
          <div className="space-y-2">
            <Label htmlFor="withdraw-offer-reason">
              {strings.withdrawOffer.reasonLabel}
              <span className="text-destructive ml-1">*</span>
            </Label>
            <Textarea
              id="withdraw-offer-reason"
              placeholder={strings.withdrawOffer.reasonPlaceholder}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isDisabled}
              rows={3}
              className={!reason.trim() && error ? 'border-destructive' : ''}
            />
          </div>

          {/* Send email checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="withdraw-offer-send-email"
              checked={sendEmail}
              onCheckedChange={(checked) => setSendEmail(checked === true)}
              disabled={isDisabled}
            />
            <Label
              htmlFor="withdraw-offer-send-email"
              className="text-sm font-normal cursor-pointer"
            >
              {strings.withdrawOffer.sendEmailLabel}
            </Label>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDisabled}>
            {strings.actions.cancel}
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDisabled || isCountdownActive}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ShieldAlert className="h-4 w-4 mr-2" />
            )}
            {isCountdownActive
              ? `${strings.withdrawOffer.confirmAction} (${countdown})`
              : strings.withdrawOffer.confirmAction}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
