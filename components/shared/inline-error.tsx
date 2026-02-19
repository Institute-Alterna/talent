'use client';

/**
 * InlineError Component
 *
 * Displays an inline error message with a warning icon.
 * Used in dialog forms to show validation or submission errors.
 */

import { AlertTriangle } from 'lucide-react';

interface InlineErrorProps {
  message: string | null;
}

export function InlineError({ message }: InlineErrorProps) {
  if (!message) return null;

  return (
    <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex items-start gap-2">
      <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
      <p className="text-sm text-destructive">{message}</p>
    </div>
  );
}
