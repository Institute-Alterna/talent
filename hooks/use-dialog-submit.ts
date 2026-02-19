/**
 * useDialogSubmit Hook
 *
 * Encapsulates the repeated state + handleConfirm + handleOpenChange + isDisabled
 * pattern shared across dialog components (schedule, reschedule, decision, complete).
 *
 * The hook stores refs to `onConfirm` and `validate` internally so callers can safely
 * close over current state values without needing their own refs.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseDialogSubmitOptions {
  /** Called on confirm — should throw to display an error */
  onConfirm: () => Promise<void>;
  /** Called when the dialog should close */
  onClose: () => void;
  /** External processing flag (e.g. from parent transition) */
  isProcessing?: boolean;
  /** Optional sync validation — return an error string to abort, or null to proceed */
  validate?: () => string | null;
}

interface UseDialogSubmitReturn {
  /** Currently submitting */
  isSubmitting: boolean;
  /** Whether any action is in progress (external processing or submitting) */
  isDisabled: boolean;
  /** Current error message, if any */
  error: string | null;
  /** Set error message programmatically */
  setError: (msg: string | null) => void;
  /** Controlled onOpenChange handler — blocks close while busy */
  handleOpenChange: (open: boolean) => void;
  /** Validated submit handler */
  handleConfirm: () => Promise<void>;
}

export function useDialogSubmit({
  onConfirm,
  onClose,
  isProcessing = false,
  validate,
}: UseDialogSubmitOptions): UseDialogSubmitReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep refs to always call the latest closures (avoids stale-closure bugs
  // and lets callers close over current state without their own refs).
  const onConfirmRef = useRef(onConfirm);
  const validateRef = useRef(validate);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onConfirmRef.current = onConfirm; }, [onConfirm]);
  useEffect(() => { validateRef.current = validate; }, [validate]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const isDisabled = isProcessing || isSubmitting;

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open && !isDisabled) {
      onCloseRef.current();
    }
  }, [isDisabled]);

  const handleConfirm = useCallback(async () => {
    if (validateRef.current) {
      const validationError = validateRef.current();
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await onConfirmRef.current();
      onCloseRef.current();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return {
    isSubmitting,
    isDisabled,
    error,
    setError,
    handleOpenChange,
    handleConfirm,
  };
}
