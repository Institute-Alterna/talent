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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { strings, recruitment } from '@/config';
import { CheckCircle, Loader2 } from 'lucide-react';
import { InlineError } from '@/components/shared/inline-error';
import { CharacterCounter } from '@/components/shared/character-counter';
import { useDialogSubmit } from '@/hooks/use-dialog-submit';
import { isValidHttpsURL } from '@/lib/utils';

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
  recordingUrl?: string;
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
  const [recordingUrl, setRecordingUrl] = React.useState('');
  const trimmedRecordingUrl = recordingUrl.trim();

  const notesError = React.useMemo(() => {
    if (!notes.trim()) return strings.interview.notesRequired;
    if (notes.length > recruitment.characterLimits.interviewNotes) return 'Notes exceed the character limit';
    return null;
  }, [notes]);

  const recordingError = React.useMemo(() => {
    if (trimmedRecordingUrl.length > recruitment.characterLimits.recordingUrl) {
      return `Recording URL cannot exceed ${recruitment.characterLimits.recordingUrl} characters`;
    }
    if (trimmedRecordingUrl && !isValidHttpsURL(trimmedRecordingUrl)) {
      return strings.interview.recordingInvalidUrl;
    }
    return null;
  }, [trimmedRecordingUrl]);

  const { isSubmitting, isDisabled, error, handleOpenChange, handleConfirm } =
    useDialogSubmit({
      onConfirm: () => {
        return onConfirm({
          notes: notes.trim(),
          ...(trimmedRecordingUrl ? { recordingUrl: trimmedRecordingUrl } : {}),
        });
      },
      onClose,
      isProcessing,
      validate: () => notesError ?? recordingError,
    });

  // Reset form when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setNotes('');
      setRecordingUrl('');
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
              maxLength={recruitment.characterLimits.interviewNotes}
              className={notesError ? 'border-destructive' : ''}
              aria-invalid={!!notesError}
              aria-describedby={notesError ? 'interview-notes-help interview-notes-error' : 'interview-notes-help'}
            />
            <div className="flex items-start justify-between gap-2">
              <p id="interview-notes-help" className="text-xs text-muted-foreground">
                {strings.interview.notesHelp}
              </p>
              <CharacterCounter value={notes} maxLength={recruitment.characterLimits.interviewNotes} />
            </div>
            {notesError && (
              <p id="interview-notes-error" className="sr-only">{notesError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="recording-url">{strings.interview.recordingLabel}</Label>
            <Input
              id="recording-url"
              type="url"
              placeholder={strings.interview.recordingPlaceholder}
              value={recordingUrl}
              onChange={(e) => setRecordingUrl(e.target.value)}
              disabled={isDisabled}
              maxLength={recruitment.characterLimits.recordingUrl}
              className={recordingError ? 'border-destructive' : ''}
              aria-invalid={!!recordingError}
              aria-describedby={recordingError ? 'recording-url-help recording-url-error' : 'recording-url-help'}
            />
            <div className="flex items-start justify-between gap-2">
              <p id="recording-url-help" className="text-xs text-muted-foreground">
                {strings.interview.recordingHelp}
              </p>
              <CharacterCounter value={recordingUrl} maxLength={recruitment.characterLimits.recordingUrl} />
            </div>
            {recordingError && (
              <p id="recording-url-error" className="sr-only">{recordingError}</p>
            )}
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
