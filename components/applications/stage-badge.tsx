'use client';

/**
 * Stage Badge Component
 *
 * Displays application stage with appropriate styling.
 * Stages: APPLICATION, GENERAL_COMPETENCIES, SPECIALIZED_COMPETENCIES, INTERVIEW, AGREEMENT, SIGNED
 */

import { Badge } from '@/components/ui/badge';
import { Stage } from '@/lib/generated/prisma/client';
import { cn } from '@/lib/utils';
import { recruitment } from '@/config';

interface StageBadgeProps {
  stage: Stage;
  className?: string;
  size?: 'sm' | 'default';
  showNumber?: boolean;
}

const STAGE_CONFIG: Record<Stage, { color: string; bgColor: string }> = {
  APPLICATION: {
    color: 'text-slate-700 dark:text-slate-300',
    bgColor: 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-800',
  },
  GENERAL_COMPETENCIES: {
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/50 dark:hover:bg-purple-900',
  },
  SPECIALIZED_COMPETENCIES: {
    color: 'text-indigo-700 dark:text-indigo-300',
    bgColor: 'bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:hover:bg-indigo-900',
  },
  INTERVIEW: {
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/50 dark:hover:bg-amber-900',
  },
  AGREEMENT: {
    color: 'text-cyan-700 dark:text-cyan-300',
    bgColor: 'bg-cyan-100 hover:bg-cyan-200 dark:bg-cyan-900/50 dark:hover:bg-cyan-900',
  },
  SIGNED: {
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 hover:bg-green-200 dark:bg-green-900/50 dark:hover:bg-green-900',
  },
};

export function StageBadge({ stage, className, size = 'default', showNumber = false }: StageBadgeProps) {
  const config = STAGE_CONFIG[stage];
  const stageInfo = recruitment.stages.find(s => s.id === stage);
  const label = stageInfo?.name || stage.replace(/_/g, ' ');

  return (
    <Badge
      variant="outline"
      className={cn(
        config.bgColor,
        config.color,
        'border-transparent font-medium',
        size === 'sm' && 'text-xs px-2 py-0.5',
        className
      )}
    >
      {showNumber && stageInfo && (
        <span className="mr-1 opacity-60">{stageInfo.order}.</span>
      )}
      {label}
    </Badge>
  );
}

/**
 * Get stage display name
 */
export function getStageName(stage: Stage): string {
  const stageInfo = recruitment.stages.find(s => s.id === stage);
  return stageInfo?.name || stage.replace(/_/g, ' ');
}

/**
 * Get stage order number
 */
export function getStageOrder(stage: Stage): number {
  const stageInfo = recruitment.stages.find(s => s.id === stage);
  return stageInfo?.order || 0;
}
