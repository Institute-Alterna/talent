'use client';

/**
 * Timeline Component
 *
 * Displays a vertical timeline of events with icons and timestamps.
 * Used for activity logs, audit trails, and event history.
 */

import * as React from 'react';
import { cn, formatDate, formatDateTime } from '@/lib/utils';
import {
  Mail,
  UserPlus,
  CheckCircle,
  Eye,
  Edit,
  Trash2,
  ArrowRight,
  Bell,
  LucideIcon,
} from 'lucide-react';

export interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  timestamp: Date | string;
  type: 'create' | 'update' | 'delete' | 'view' | 'email' | 'status_change' | 'stage_change' | 'default';
  user?: {
    name: string;
    email?: string;
  };
  metadata?: Record<string, unknown>;
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
  maxItems?: number;
  emptyMessage?: string;
}

const TYPE_CONFIG: Record<TimelineItem['type'], { icon: LucideIcon; color: string; bgColor: string }> = {
  create: {
    icon: UserPlus,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  update: {
    icon: Edit,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  delete: {
    icon: Trash2,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  view: {
    icon: Eye,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  email: {
    icon: Mail,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  status_change: {
    icon: CheckCircle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  stage_change: {
    icon: ArrowRight,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
  },
  default: {
    icon: Bell,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
};

function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  // Use shared formatting (D MMMM YYYY)
  return formatDate(then);

}

function formatTimestamp(date: Date | string): string {
  // Use shared helper for consistent timestamp formatting (D MMMM YYYY, 24-hour time)
  return formatDateTime(date);
}

export function Timeline({ items, className, maxItems, emptyMessage = 'No activity yet' }: TimelineProps) {
  const displayItems = maxItems ? items.slice(0, maxItems) : items;

  if (displayItems.length === 0) {
    return (
      <div className={cn('text-center py-8 text-muted-foreground', className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {/* Vertical line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

      <div className="space-y-4">
        {displayItems.map((item) => {
          const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.default;
          const Icon = config.icon;

          return (
            <div key={item.id} className="relative pl-10">
              {/* Icon */}
              <div
                className={cn(
                  'absolute left-0 w-8 h-8 rounded-full flex items-center justify-center',
                  config.bgColor
                )}
              >
                <Icon className={cn('w-4 h-4', config.color)} />
              </div>

              {/* Content */}
              <div className="bg-card border rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground">
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 break-words">
                        {item.description}
                      </p>
                    )}
                    {item.user && (
                      <p className="text-xs text-muted-foreground mt-1">
                        by {item.user.name}
                      </p>
                    )}
                  </div>
                  <time
                    className="text-xs text-muted-foreground whitespace-nowrap"
                    title={formatTimestamp(item.timestamp)}
                    dateTime={new Date(item.timestamp).toISOString()}
                  >
                    {formatRelativeTime(item.timestamp)}
                  </time>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {maxItems && items.length > maxItems && (
        <div className="text-center mt-4">
          <span className="text-sm text-muted-foreground">
            +{items.length - maxItems} more events
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Map action type from audit log to timeline type
 */
export function mapActionTypeToTimelineType(
  actionType: string
): TimelineItem['type'] {
  switch (actionType) {
    case 'CREATE':
      return 'create';
    case 'UPDATE':
      return 'update';
    case 'DELETE':
      return 'delete';
    case 'VIEW':
      return 'view';
    case 'EMAIL_SENT':
      return 'email';
    case 'STATUS_CHANGE':
      return 'status_change';
    case 'STAGE_CHANGE':
      return 'stage_change';
    default:
      return 'default';
  }
}
