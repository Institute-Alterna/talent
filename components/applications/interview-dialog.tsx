'use client';

/**
 * InterviewDialog Component
 *
 * Unified dialog for scheduling or rescheduling an interview with a candidate.
 * Controlled by `mode`:
 *   - "schedule" — first-time scheduling, shows "no interviewers" state + settings link
 *   - "reschedule" — changing an existing interview, shows warning banner + mailto link
 *
 * Shared behaviour:
 *   - Interviewer selection (filtered to those with scheduling links)
 *   - Send/resend invitation email checkbox
 *   - Validation, loading, and error states
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
import { Calendar, Loader2, AlertTriangle, ExternalLink, Mail } from 'lucide-react';
import { InlineError } from '@/components/shared/inline-error';
import { useDialogSubmit } from '@/hooks/use-dialog-submit';
import type { Interviewer } from '@/types/shared';
import Link from 'next/link';

export type { Interviewer } from '@/types/shared';

export interface InterviewDialogData {
  interviewerId: string;
  sendEmail: boolean;
}

// --- Schedule-specific props --- //

interface ScheduleProps {
  mode: 'schedule';
  /** Current user id — used to default the interviewer selection */
  currentUserId?: string;
  onConfirm: (data: InterviewDialogData) => Promise<void>;
}

// --- Reschedule-specific props --- //

interface RescheduleProps {
  mode: 'reschedule';
  /** Current interviewer id on the existing interview */
  currentInterviewerId?: string;
  candidateEmail: string;
  candidateName: string;
  onConfirm: (data: InterviewDialogData) => Promise<void>;
}

// --- Common props --- //

interface CommonProps {
  isOpen: boolean;
  onClose: () => void;
  applicationName: string;
  interviewers: Interviewer[];
  isProcessing?: boolean;
  isLoadingInterviewers?: boolean;
}

export type InterviewDialogProps = CommonProps & (ScheduleProps | RescheduleProps);

// ---------------------------------------------------------------------------

export function InterviewDialog(props: InterviewDialogProps) {
  const {
    mode,
    isOpen,
    onClose,
    onConfirm,
    applicationName,
    interviewers,
    isProcessing = false,
    isLoadingInterviewers = false,
  } = props;

  const [interviewerId, setInterviewerId] = React.useState('');
  const [sendEmail, setSendEmail] = React.useState(true);

  // Filter interviewers to only those with scheduling links
  const availableInterviewers = React.useMemo(
    () => interviewers.filter((i) => !!i.schedulingLink),
    [interviewers],
  );

  // Default interviewer id depends on mode
  const defaultId =
    mode === 'reschedule'
      ? props.currentInterviewerId
      : props.currentUserId;

  // Reset form when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      const match = availableInterviewers.find((i) => i.id === defaultId);
      setInterviewerId(match?.id || availableInterviewers[0]?.id || '');
      setSendEmail(true);
    }
  }, [isOpen, availableInterviewers, defaultId]);

  const selectedInterviewer = availableInterviewers.find((i) => i.id === interviewerId);
  const isInterviewerChanged =
    mode === 'reschedule' && interviewerId !== props.currentInterviewerId;

  const { isSubmitting, isDisabled, error, handleOpenChange, handleConfirm } =
    useDialogSubmit({
      onConfirm: () => onConfirm({ interviewerId, sendEmail }),
      onClose,
      isProcessing,
      validate: () => {
        if (!interviewerId) return strings.interview.interviewerRequired;
        if (!selectedInterviewer?.schedulingLink)
          return strings.interview.schedulingLinkRequired;
        return null;
      },
    });

  const isSchedule = mode === 'schedule';
  const hasNoInterviewers = isSchedule && availableInterviewers.length === 0;

  const title = isSchedule
    ? strings.interview.scheduleInterview
    : strings.interview.rescheduleInterview;
  const description = isSchedule
    ? strings.interview.scheduleDescription
    : strings.interview.rescheduleDescription;
  const confirmLabel = isSchedule
    ? strings.interview.confirmSchedule
    : strings.interview.confirmReschedule;
  const emailLabel = isSchedule
    ? strings.interview.sendInvitationEmail
    : strings.interview.resendInvitationEmail;

  // --- Reschedule warning banner --- //
  const rescheduleWarning =
    mode === 'reschedule' ? (
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
            <a
              href={`mailto:${props.candidateEmail}?subject=Interview Reschedule - ${applicationName}&body=Dear ${props.candidateName},%0D%0A%0D%0AYour interview has been rescheduled. You will receive a new invitation email shortly.%0D%0A%0D%0ABest regards`}
            >
              <Button size="sm" variant="outline" className="mt-1 h-7 text-xs">
                <Mail className="h-3 w-3 mr-1" />
                Email Candidate
              </Button>
            </a>
          </div>
        </div>
      </div>
    ) : null;

  // --- No interviewers banner (schedule only) --- //
  const noInterviewersBanner = hasNoInterviewers ? (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3 dark:bg-amber-950/50 dark:border-amber-800">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 dark:text-amber-400" />
        <div className="space-y-2">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            {strings.interview.noInterviewersAvailable}
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {strings.interview.noInterviewersHelp}
          </p>
          <Link href="/settings">
            <Button size="sm" variant="outline" className="mt-2">
              <ExternalLink className="h-3 w-3 mr-2" />
              Go to Settings
            </Button>
          </Link>
        </div>
      </div>
    </div>
  ) : null;

  // --- Loading skeleton --- //
  const loadingSkeleton = (
    <>
      <div className="space-y-2">
        <Label htmlFor="interviewer">
          {strings.interview.selectInterviewer}
          <span className="text-destructive ml-1">*</span>
        </Label>
        <div className="h-10 bg-muted animate-pulse rounded-md" />
        <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
      </div>
      <div className="flex items-center space-x-2">
        <div className="h-4 w-4 bg-muted animate-pulse rounded" />
        <div className="h-4 w-48 bg-muted animate-pulse rounded" />
      </div>
    </>
  );

  // --- Interviewer selector (shared) --- //
  const interviewerSelector = (
    <>
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
            Scheduling link:{' '}
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

      {/* Send / resend email checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="send-email"
          checked={sendEmail}
          onCheckedChange={(checked) => setSendEmail(checked === true)}
          disabled={isDisabled}
        />
        <Label htmlFor="send-email" className="text-sm font-normal cursor-pointer">
          {emailLabel}
        </Label>
      </div>
    </>
  );

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {description}
            <span className="block mt-1 font-medium text-foreground">
              {applicationName}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <InlineError message={error} />
          {rescheduleWarning}
          {noInterviewersBanner ??
            (isLoadingInterviewers ? loadingSkeleton : interviewerSelector)}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDisabled}>
            {strings.actions.cancel}
          </AlertDialogCancel>
          <Button
            onClick={handleConfirm}
            disabled={isDisabled || !!hasNoInterviewers || isLoadingInterviewers}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Calendar className="h-4 w-4 mr-2" />
            )}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
