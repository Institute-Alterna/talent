'use client';

/**
 * Status Badge Component
 *
 * Displays application status with appropriate styling.
 * Statuses: ACTIVE, ACCEPTED, REJECTED
 */

import { Badge } from '@/components/ui/badge';
import { Status } from '@/lib/generated/prisma/client';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: Status;
  className?: string;
  size?: 'sm' | 'default';
}

const STATUS_CONFIG: Record<Status, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
  ACTIVE: {
    label: 'Active',
    variant: 'default',
    className: 'bg-blue-500 hover:bg-blue-600',
  },
  ACCEPTED: {
    label: 'Accepted',
    variant: 'default',
    className: 'bg-green-700 hover:bg-green-800',
  },
  REJECTED: {
    label: 'Rejected',
    variant: 'destructive',
    className: '',
  },
};

export function StatusBadge({ status, className, size = 'default' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge
      variant={config.variant}
      className={cn(
        config.className,
        size === 'sm' && 'text-xs px-2 py-0.5',
        className
      )}
    >
      {config.label}
    </Badge>
  );
}
