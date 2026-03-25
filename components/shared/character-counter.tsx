'use client';

import { cn } from '@/lib/utils';

interface CharacterCounterProps {
  value: string;
  maxLength: number;
  /** Fraction of limit at which the counter becomes visible (default: 0.8) */
  showThreshold?: number;
}

/**
 * Polished character counter for multi-line text fields.
 *
 * Fades in when the user approaches the character limit, cycling through
 * muted → warning → destructive colour states with smooth transitions.
 * Renders as a right-aligned line below the Textarea.
 */
export function CharacterCounter({
  value,
  maxLength,
  showThreshold = 0.8,
}: CharacterCounterProps) {
  const count = value.length;
  const ratio = count / maxLength;
  const isVisible = ratio >= showThreshold;
  const isOver = count > maxLength;
  const isWarning = !isOver && ratio >= 0.95;

  return (
    <div
      className={cn(
        'flex justify-end transition-opacity duration-300',
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none select-none'
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      <span
        className={cn(
          'text-xs tabular-nums transition-colors duration-300',
          isOver
            ? 'text-destructive font-medium'
            : isWarning
              ? 'text-amber-500 dark:text-amber-400'
              : 'text-muted-foreground'
        )}
      >
        {count} / {maxLength}
      </span>
    </div>
  );
}
