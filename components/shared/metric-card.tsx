/**
 * MetricCard Component
 *
 * Compact card for displaying a single metric with label and value.
 * Optionally rendered as a button for interactive metrics.
 */

import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string | number;
  children?: React.ReactNode;
  className?: string;
  /** Render as a button element */
  asButton?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export function MetricCard({
  label,
  value,
  children,
  className,
  asButton,
  onClick,
  disabled,
}: MetricCardProps) {
  const content = (
    <>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-lg font-semibold tabular-nums">{value}</span>
        {children}
      </div>
    </>
  );

  if (asButton) {
    return (
      <button
        type="button"
        className={cn(
          'rounded-lg border bg-card px-3 py-2 flex items-center justify-between text-left w-full cursor-pointer hover:bg-accent/50 transition-colors',
          className,
        )}
        onClick={onClick}
        disabled={disabled}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border bg-card px-3 py-2 flex items-center justify-between',
        className,
      )}
    >
      {content}
    </div>
  );
}
