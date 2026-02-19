'use client';

/**
 * Complete Interview Dialog Component
 *
 * Dialog for marking an interview as completed and adding notes.
 * Features:
 * - Required notes textarea field
 * - Loading states and error handling
 * - Confirmation flow
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
import { strings } from '@/config';
import { CheckCircle, Loader2 } from 'lucide-react';
import { InlineError } from '@/components/shared/inline-error';
import { useDialogSubmit } from '@/hooks/use-dialog-submit';

export interface CompleteInterviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: CompleteInterviewData) => Promise<void>;
  applicationName: string;
  interviewerName: string;
  isProcessing?: boolean;
}

export interface CompleteInterviewData {
  notes: string;
}

export function CompleteInterviewDialog({
  isOpen,
  onClose,
  onConfirm,
  applicationName,
  interviewerName,
  isProcessing = false,
}: CompleteInterviewDialogProps) {
  const [notes, setNotes] = React.useState('');

  const { isSubmitting, isDisabled, error, handleOpenChange, handleConfirm } =
    useDialogSubmit({
      onConfirm: () => onConfirm({ notes: notes.trim() }),
      onClose,
      isProcessing,
      validate: () =>
        !notes.trim() ? strings.interview.notesRequired : null,
    });

  // Reset form when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setNotes('');
    }
  }, [isOpen]);

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            {strings.interview.completeInterview}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {strings.interview.completeDescription}
            <span className="block mt-1 font-medium text-foreground">
              {applicationName}
            </span>
            <span className="block mt-1 text-sm text-muted-foreground">
              Interviewer: {interviewerName}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Error message */}
          <InlineError message={error} />

          {/* Notes field - required */}
          <div className="space-y-2">
            <Label htmlFor="interview-notes">
              {strings.interview.interviewNotes}
              <span className="text-destructive ml-1">*</span>
            </Label>
            <Textarea
              id="interview-notes"
              placeholder={strings.interview.notesPlaceholder}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isDisabled}
              rows={5}
              className={!notes.trim() && error ? 'border-destructive' : ''}
            />
            <p className="text-xs text-muted-foreground">
              {strings.interview.notesHelp}
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDisabled}>
            {strings.actions.cancel}
          </AlertDialogCancel>
          <Button
            onClick={handleConfirm}
            disabled={isDisabled}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            {strings.interview.confirmComplete}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
