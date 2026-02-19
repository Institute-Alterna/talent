'use client';

/**
 * Reschedule Interview Dialog Component
 *
 * Dialog for rescheduling an existing interview.
 * Features:
 * - Change interviewer selection
 * - Resend invitation email checkbox (default checked)
 * - Warning about manual candidate notification with mailto link
 * - Loading states and error handling
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { strings } from '@/config';
import { Calendar, Loader2, AlertTriangle, Mail } from 'lucide-react';
import { InlineError } from '@/components/shared/inline-error';
import { useDialogSubmit } from '@/hooks/use-dialog-submit';

export interface Interviewer {
  id: string;
  displayName: string;
  email: string;
  schedulingLink: string | null;
}

export interface RescheduleInterviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: RescheduleInterviewData) => Promise<void>;
  applicationName: string;
  candidateEmail: string;
  candidateName: string;
  interviewers: Interviewer[];
  currentInterviewerId?: string;
  isProcessing?: boolean;
  isLoadingInterviewers?: boolean;
}

export interface RescheduleInterviewData {
  interviewerId: string;
  resendEmail: boolean;
}

export function RescheduleInterviewDialog({
  isOpen,
  onClose,
  onConfirm,
  applicationName,
  candidateEmail,
  candidateName,
  interviewers,
  currentInterviewerId,
  isProcessing = false,
  isLoadingInterviewers = false,
}: RescheduleInterviewDialogProps) {
  const [interviewerId, setInterviewerId] = React.useState('');
  const [resendEmail, setResendEmail] = React.useState(true);

  // Filter interviewers to only those with scheduling links
  const availableInterviewers = React.useMemo(
    () => interviewers.filter(i => !!i.schedulingLink),
    [interviewers]
  );

  // Reset form when dialog opens - default to current interviewer
  React.useEffect(() => {
    if (isOpen) {
      setInterviewerId(currentInterviewerId || availableInterviewers[0]?.id || '');
      setResendEmail(true);
    }
  }, [isOpen, currentInterviewerId, availableInterviewers]);

  const selectedInterviewer = availableInterviewers.find(i => i.id === interviewerId);
  const isInterviewerChanged = interviewerId !== currentInterviewerId;

  const { isSubmitting, isDisabled, error, handleOpenChange, handleConfirm } =
    useDialogSubmit({
      onConfirm: () =>
        onConfirm({
          interviewerId,
          resendEmail,
        }),
      onClose,
      isProcessing,
      validate: () => {
        if (!interviewerId)
          return strings.interview.interviewerRequired;
        if (!selectedInterviewer?.schedulingLink)
          return strings.interview.schedulingLinkRequired;
        return null;
      },
    });

  const mailtoLink = `mailto:${candidateEmail}?subject=Interview Reschedule - ${applicationName}&body=Dear ${candidateName},%0D%0A%0D%0AYour interview has been rescheduled. You will receive a new invitation email shortly.%0D%0A%0D%0ABest regards`;

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {strings.interview.rescheduleInterview}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {strings.interview.rescheduleDescription}
            <span className="block mt-1 font-medium text-foreground">
              {applicationName}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Error message */}
          <InlineError message={error} />

          {/* Warning about candidate notification */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 dark:bg-amber-950/50 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5 dark:text-amber-400" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                  {strings.interview.rescheduleWarning}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {strings.interview.contactCandidateWarning}
                </p>
                <a href={mailtoLink}>
                  <Button size="sm" variant="outline" className="mt-1 h-7 text-xs">
                    <Mail className="h-3 w-3 mr-1" />
                    Email Candidate
                  </Button>
                </a>
              </div>
            </div>
          </div>

          {/* Interviewer selector */}
          {isLoadingInterviewers ? (
            <div className="space-y-2">
              <Label htmlFor="interviewer">
                {strings.interview.selectInterviewer}
                <span className="text-destructive ml-1">*</span>
              </Label>
              <div className="h-10 bg-muted animate-pulse rounded-md" />
              <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="interviewer">
                {strings.interview.selectInterviewer}
                <span className="text-destructive ml-1">*</span>
              </Label>
              <Select
                value={interviewerId}
                onValueChange={setInterviewerId}
                disabled={isDisabled}
              >
                <SelectTrigger id="interviewer">
                  <SelectValue placeholder={strings.interview.selectInterviewerPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {availableInterviewers.map((interviewer) => (
                    <SelectItem key={interviewer.id} value={interviewer.id}>
                      <div className="flex flex-col items-start text-left">
                        <span>{interviewer.displayName}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedInterviewer && (
                <p className="text-xs text-muted-foreground">
                  Scheduling link: {' '}
                  <a
                    href={selectedInterviewer.schedulingLink || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {selectedInterviewer.schedulingLink}
                  </a>
                </p>
              )}
              {isInterviewerChanged && (
                <p className="text-xs text-amber-600 font-medium">
                  ⚠ Interviewer will be changed
                </p>
              )}
            </div>
          )}

          {/* Resend email checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="resend-email"
              checked={resendEmail}
              onCheckedChange={(checked) => setResendEmail(checked === true)}
              disabled={isDisabled}
            />
            <Label
              htmlFor="resend-email"
              className="text-sm font-normal cursor-pointer"
            >
              {strings.interview.resendInvitationEmail}
            </Label>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDisabled}>
            {strings.actions.cancel}
          </AlertDialogCancel>
          <Button
            onClick={handleConfirm}
            disabled={isDisabled || isLoadingInterviewers}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Calendar className="h-4 w-4 mr-2" />
            )}
            {strings.interview.confirmReschedule}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
