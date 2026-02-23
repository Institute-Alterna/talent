'use client';

/**
 * Decision Dialog Component
 *
 * Confirmation dialog for making accept/reject decisions on applications.
 * Features:
 * - Required reason field for rejections (GDPR compliance)
 * - Optional notes field
 * - Send email checkbox
 * - Loading spinners during processing
 * - Disabled buttons while processing
 * - Error handling and display
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
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { InlineError } from '@/components/shared/inline-error';
import { useDialogSubmit } from '@/hooks/use-dialog-submit';

export interface DecisionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: DecisionData) => Promise<void>;
  decision: 'ACCEPT' | 'REJECT';
  applicationName: string;
  isProcessing?: boolean;
}

export interface DecisionData {
  decision: 'ACCEPT' | 'REJECT';
  reason: string;
  notes?: string;
  sendEmail: boolean;
}

export function DecisionDialog({
  isOpen,
  onClose,
  onConfirm,
  decision,
  applicationName,
  isProcessing = false,
}: DecisionDialogProps) {
  const [reason, setReason] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [sendEmail, setSendEmail] = React.useState(true);

  const isReject = decision === 'REJECT';
  // ACCEPT always sends the offer letter (contains agreement link)
  const isAccept = decision === 'ACCEPT';

  const { isSubmitting, isDisabled, error, handleOpenChange, handleConfirm } =
    useDialogSubmit({
      onConfirm: () =>
        onConfirm({
          decision,
          reason: reason.trim(),
          notes: notes.trim() || undefined,
          sendEmail: isAccept ? true : sendEmail,
        }),
      onClose,
      isProcessing,
      validate: () =>
        isReject && !reason.trim()
          ? strings.decision.reasonGdprNote
          : null,
    });

  // Reset form when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setReason('');
      setNotes('');
      setSendEmail(true);
    }
  }, [isOpen]);

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isReject ? (
              <XCircle className="h-5 w-5 text-destructive" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-600" />
            )}
            {isReject ? strings.decision.rejectTitle : strings.decision.acceptTitle}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isReject ? strings.decision.rejectDescription : strings.decision.acceptDescription}
            <span className="block mt-1 font-medium text-foreground">
              {applicationName}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Error message */}
          <InlineError message={error} />

          {/* Reason field */}
          <div className="space-y-2">
            <Label htmlFor="decision-reason">
              {strings.decision.reasonLabel}
              {isReject && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              id="decision-reason"
              placeholder={strings.decision.reasonPlaceholder}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isDisabled}
              rows={3}
              className={isReject && !reason.trim() && error ? 'border-destructive' : ''}
            />
            {isReject && (
              <p className="text-xs text-muted-foreground">
                {strings.decision.reasonGdprNote}
              </p>
            )}
          </div>

          {/* Notes field */}
          <div className="space-y-2">
            <Label htmlFor="decision-notes">{strings.decision.notesLabel}</Label>
            <Textarea
              id="decision-notes"
              placeholder={strings.decision.notesPlaceholder}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isDisabled}
              rows={2}
            />
          </div>

          {/* Send email — always on for ACCEPT, checkbox for REJECT */}
          {isAccept ? (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
              {strings.decision.acceptEmailInfo}
            </p>
          ) : (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="send-email"
                checked={sendEmail}
                onCheckedChange={(checked) => setSendEmail(checked === true)}
                disabled={isDisabled}
              />
              <Label
                htmlFor="send-email"
                className="text-sm font-normal cursor-pointer"
              >
                {strings.decision.sendEmailLabel}
              </Label>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDisabled}>
            {strings.actions.cancel}
          </AlertDialogCancel>
          <Button
            variant={isReject ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={isDisabled}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : isReject ? (
              <XCircle className="h-4 w-4 mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            {isReject ? strings.decision.confirmReject : strings.decision.confirmAccept}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
