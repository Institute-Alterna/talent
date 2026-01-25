'use client';

/**
 * Schedule Interview Dialog Component
 *
 * Dialog for scheduling a new interview with candidate.
 * Features:
 * - Interviewer selection (hiring managers/admins with scheduling links)
 * - Validation that selected interviewer has scheduling link
 * - Send invitation email checkbox (default checked)
 * - Loading states and error handling
 * - Link to settings if no interviewers available
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
import { Calendar, Loader2, AlertTriangle, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export interface Interviewer {
  id: string;
  displayName: string;
  email: string;
  schedulingLink: string | null;
}

export interface ScheduleInterviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: ScheduleInterviewData) => Promise<void>;
  applicationName: string;
  interviewers: Interviewer[];
  currentUserId?: string;
  isProcessing?: boolean;
  isLoadingInterviewers?: boolean;
}

export interface ScheduleInterviewData {
  interviewerId: string;
  sendEmail: boolean;
}

export function ScheduleInterviewDialog({
  isOpen,
  onClose,
  onConfirm,
  applicationName,
  interviewers,
  currentUserId,
  isProcessing = false,
  isLoadingInterviewers = false,
}: ScheduleInterviewDialogProps) {
  const [interviewerId, setInterviewerId] = React.useState('');
  const [sendEmail, setSendEmail] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Filter interviewers to only those with scheduling links
  const availableInterviewers = React.useMemo(
    () => interviewers.filter(i => !!i.schedulingLink),
    [interviewers]
  );

  // Reset form when dialog opens - default to current user if they have a link
  React.useEffect(() => {
    if (isOpen) {
      const defaultInterviewer = availableInterviewers.find(i => i.id === currentUserId);
      setInterviewerId(defaultInterviewer?.id || availableInterviewers[0]?.id || '');
      setSendEmail(true);
      setError(null);
    }
  }, [isOpen, availableInterviewers, currentUserId]);

  const selectedInterviewer = availableInterviewers.find(i => i.id === interviewerId);

  const handleConfirm = async () => {
    // Validate interviewer selected
    if (!interviewerId) {
      setError(strings.interview.interviewerRequired);
      return;
    }

    // Validate interviewer has scheduling link
    if (!selectedInterviewer?.schedulingLink) {
      setError(strings.interview.schedulingLinkRequired);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await onConfirm({
        interviewerId,
        sendEmail,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isProcessing && !isSubmitting) {
      onClose();
    }
  };

  const isDisabled = isProcessing || isSubmitting;
  const hasNoInterviewers = availableInterviewers.length === 0;

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {strings.interview.scheduleInterview}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {strings.interview.scheduleDescription}
            <span className="block mt-1 font-medium text-foreground">
              {applicationName}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Error message */}
          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* No interviewers available */}
          {hasNoInterviewers ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-amber-900">
                    {strings.interview.noInterviewersAvailable}
                  </p>
                  <p className="text-sm text-amber-700">
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
          ) : isLoadingInterviewers ? (
            <>
              {/* Loading skeleton */}
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
          ) : (
            <>
              {/* Interviewer selector */}
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
              </div>

              {/* Send email checkbox */}
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
                  {strings.interview.sendInvitationEmail}
                </Label>
              </div>
            </>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDisabled}>
            {strings.actions.cancel}
          </AlertDialogCancel>
          <Button
            onClick={handleConfirm}
            disabled={isDisabled || hasNoInterviewers || isLoadingInterviewers}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Calendar className="h-4 w-4 mr-2" />
            )}
            {strings.interview.confirmSchedule}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
