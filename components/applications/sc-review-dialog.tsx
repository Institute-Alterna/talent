'use client';

/**
 * SC Review Dialog Component
 *
 * Confirmation dialog for reviewing specialised competency assessments.
 * Shows the competency name, category, evaluation criterion, and submission
 * URLs so the admin can make an informed pass/fail decision.
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
import { Badge } from '@/components/ui/badge';
import { strings } from '@/config';
import { CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react';
import { InlineError } from '@/components/shared/inline-error';
import { useDialogSubmit } from '@/hooks/use-dialog-submit';

export interface SCReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (assessmentId: string, passed: boolean) => Promise<void>;
  isProcessing?: boolean;
  assessment: {
    id: string;
    specialisedCompetency: {
      name: string;
      category: string;
      criterion: string;
    } | null;
    submissionUrls: Array<{ label: string; url: string; type: string }> | null;
  } | null;
}

export function SCReviewDialog({
  isOpen,
  onClose,
  onConfirm,
  isProcessing = false,
  assessment,
}: SCReviewDialogProps) {
  const [decision, setDecision] = React.useState<boolean | null>(null);

  const { isSubmitting, isDisabled, error, handleOpenChange, handleConfirm } =
    useDialogSubmit({
      onConfirm: async () => {
        if (!assessment || decision === null) return;
        await onConfirm(assessment.id, decision);
      },
      onClose,
      isProcessing,
      validate: () => (decision === null ? 'Select pass or fail' : null),
    });

  // Reset when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setDecision(null);
    }
  }, [isOpen]);

  const sc = assessment?.specialisedCompetency;

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {strings.competencies.reviewAssessment}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Review the submission and evaluation criterion before confirming your decision.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          <InlineError message={error} />

          {/* Competency details */}
          {sc && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{sc.name}</span>
                <Badge variant="outline" className="text-xs">{sc.category}</Badge>
              </div>

              {/* Criterion */}
              <div className="rounded-md border p-3 bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground mb-1">Evaluation Criterion</p>
                <p className="text-sm">{sc.criterion}</p>
              </div>
            </div>
          )}

          {/* Submission URLs */}
          {assessment?.submissionUrls && assessment.submissionUrls.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Submissions</p>
              <div className="flex flex-wrap gap-1.5">
                {assessment.submissionUrls.map((sub, idx) => (
                  <a
                    key={idx}
                    href={sub.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border hover:bg-muted/50 transition-colors text-primary"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {sub.label}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Pass/Fail selection */}
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant={decision === false ? 'destructive' : 'outline'}
              className={`text-xs h-8 flex-1 ${decision !== false ? 'border-destructive/40 text-destructive hover:bg-destructive/10' : ''}`}
              onClick={() => setDecision(false)}
              disabled={isDisabled}
            >
              <XCircle className="h-3 w-3 mr-1" />
              {strings.competencies.markFailed}
            </Button>
            <Button
              size="sm"
              variant={decision === true ? 'default' : 'outline'}
              className="text-xs h-8 flex-1"
              onClick={() => setDecision(true)}
              disabled={isDisabled}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              {strings.competencies.markPassed}
            </Button>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDisabled}>
            {strings.actions.cancel}
          </AlertDialogCancel>
          <Button
            variant={decision === false ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={isDisabled || decision === null}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : decision === false ? (
              <XCircle className="h-4 w-4 mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            {decision === false ? 'Confirm Fail' : decision === true ? 'Confirm Pass' : 'Select Decision'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
