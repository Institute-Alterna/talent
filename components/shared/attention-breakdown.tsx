'use client';

/**
 * AttentionBreakdownPanel Component
 *
 * Shows a breakdown of applications requiring attention, grouped by category.
 * Renders inside a Dialog (desktop) or Sheet (mobile).
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { AlertTriangle } from 'lucide-react';
import { MetricCard } from './metric-card';

export interface AttentionBreakdown {
  awaitingGC: number;
  awaitingSC: number;
  pendingInterviews: number;
  pendingAgreement: number;
  total: number;
}

interface AttentionBreakdownPanelProps {
  breakdown: AttentionBreakdown;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDesktop: boolean;
  /** Action button configuration */
  action: {
    label: string;
    onClick: () => void;
    /** When provided, wraps the button in a Next.js Link */
    href?: string;
  };
}

const BREAKDOWN_ITEMS: { key: keyof Omit<AttentionBreakdown, 'total'>; label: string }[] = [
  { key: 'awaitingGC', label: 'Awaiting General Competencies' },
  { key: 'awaitingSC', label: 'Awaiting Specialised Competencies' },
  { key: 'pendingInterviews', label: 'Pending Interviews' },
  { key: 'pendingAgreement', label: 'Pending Agreement' },
];

export function AttentionBreakdownPanel({
  breakdown,
  open,
  onOpenChange,
  isDesktop,
  action,
}: AttentionBreakdownPanelProps) {
  if (breakdown.total === 0) return null;

  const description = `${breakdown.total} application${breakdown.total !== 1 ? 's' : ''} requiring attention`;

  const actionButton = (
    <Button
      className="w-full bg-amber-500 hover:bg-amber-600 text-white dark:bg-amber-600 dark:hover:bg-amber-700"
      onClick={action.onClick}
    >
      <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
      {action.label}
    </Button>
  );

  const content = (
    <div className="space-y-4">
      <div className="grid gap-3">
        {BREAKDOWN_ITEMS.map(
          ({ key, label }) =>
            breakdown[key] > 0 && (
              <MetricCard key={key} label={label} value={breakdown[key]} />
            ),
        )}
      </div>
      {action.href ? <Link href={action.href}>{actionButton}</Link> : actionButton}
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Needs Attention</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-xl">
        <SheetHeader>
          <SheetTitle>Needs Attention</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6 pt-2">{content}</div>
      </SheetContent>
    </Sheet>
  );
}
