'use client';

/**
 * Pipeline Board Component
 *
 * Kanban-style board displaying applications by stage.
 * Each column represents a recruitment stage with application cards.
 */

import * as React from 'react';
import { Stage } from '@/lib/generated/prisma/client';
import { ApplicationCard, ApplicationCardData } from './application-card';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { recruitment } from '@/config';

export interface PipelineBoardData {
  APPLICATION: ApplicationCardData[];
  GENERAL_COMPETENCIES: ApplicationCardData[];
  SPECIALIZED_COMPETENCIES: ApplicationCardData[];
  INTERVIEW: ApplicationCardData[];
  AGREEMENT: ApplicationCardData[];
  SIGNED: ApplicationCardData[];
}

interface PipelineBoardProps {
  data: PipelineBoardData;
  onViewApplication: (id: string) => void;
  onSendEmail?: (id: string) => void;
  onScheduleInterview?: (id: string) => void;
  onExportPdf?: (id: string) => void;
  onWithdraw?: (id: string) => void;
  exportingPdfId?: string | null;
  isAdmin?: boolean;
  isLoading?: boolean;
  className?: string;
}

const STAGE_ORDER: Stage[] = [
  'APPLICATION',
  'GENERAL_COMPETENCIES',
  'SPECIALIZED_COMPETENCIES',
  'INTERVIEW',
  'AGREEMENT',
  'SIGNED',
];



interface StageColumnProps {
  stage: Stage;
  applications: ApplicationCardData[];
  onViewApplication: (id: string) => void;
  onSendEmail?: (id: string) => void;
  onScheduleInterview?: (id: string) => void;
  onExportPdf?: (id: string) => void;
  onWithdraw?: (id: string) => void;
  exportingPdfId?: string | null;
  isAdmin?: boolean;
}

function StageColumn({
  stage,
  applications,
  onViewApplication,
  onSendEmail,
  onScheduleInterview,
  onExportPdf,
  onWithdraw,
  exportingPdfId,
  isAdmin,
}: StageColumnProps) {
  const count = applications.length;

  return (
    <div className="flex-shrink-0 w-72 flex flex-col rounded-xl border border-border/50 bg-card/50 min-h-[400px] snap-start">
      {/* Column header */}
      <div className="relative p-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {(recruitment.stages.find(s => s.id === stage)?.name || stage.replace(/_/g, ' '))}
          </span>
          <span className="inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-muted text-xs font-medium px-1.5">
            {count}
          </span>
        </div>
      </div>

      {/* Cards container */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-2">
          {applications.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No applications
            </div>
          ) : (
            applications.map((app) => (
              <ApplicationCard
                key={app.id}
                application={app}
                onView={onViewApplication}
                onSendEmail={onSendEmail}
                onScheduleInterview={onScheduleInterview}
                onExportPdf={onExportPdf}
                onWithdraw={onWithdraw}
                isExportingPdf={exportingPdfId === app.id}
                isAdmin={isAdmin}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function PipelineSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STAGE_ORDER.map((stage) => (
        <div
          key={stage}
          className="flex-shrink-0 w-72 bg-muted/30 rounded-lg animate-pulse"
        >
          <div className="p-3 border-b">
            <div className="h-6 bg-muted rounded w-32" />
          </div>
          <div className="p-2 space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 bg-muted rounded"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function PipelineBoard({
  data,
  onViewApplication,
  onSendEmail,
  onScheduleInterview,
  onExportPdf,
  onWithdraw,
  exportingPdfId,
  isAdmin = false,
  isLoading = false,
  className,
}: PipelineBoardProps) {
  // Show skeleton only on initial load (no data yet)
  const hasData = STAGE_ORDER.some((stage) => (data[stage] || []).length > 0);
  if (isLoading && !hasData) {
    return <PipelineSkeleton />;
  }

  return (
    <div className="relative">
      {/* Subtle loading overlay on refresh — keeps existing board visible */}
      {isLoading && hasData && (
        <div className="absolute inset-0 z-10 bg-background/50 rounded-lg pointer-events-none animate-in fade-in duration-200" />
      )}
      <ScrollArea className={cn('w-full snap-x snap-mandatory', isLoading && hasData && 'opacity-80 transition-opacity duration-200', className)}>
        <div className="flex gap-4 pb-4 min-w-max">
          {STAGE_ORDER.map((stage) => (
            <StageColumn
              key={stage}
              stage={stage}
              applications={data[stage] || []}
              onViewApplication={onViewApplication}
              onSendEmail={onSendEmail}
              onScheduleInterview={onScheduleInterview}
              onExportPdf={onExportPdf}
              onWithdraw={onWithdraw}
              exportingPdfId={exportingPdfId}
              isAdmin={isAdmin}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

/**
 * Calculate pipeline statistics from data
 */
export function calculatePipelineStats(data: PipelineBoardData) {
  let total = 0;
  let active = 0;
  const byStage: Record<Stage, number> = {} as Record<Stage, number>;

  for (const stage of STAGE_ORDER) {
    const applications = data[stage] || [];
    byStage[stage] = applications.length;
    total += applications.length;
    active += applications.filter(a => a.status === 'ACTIVE').length;
  }

  return {
    total,
    active,
    byStage,
  };
}
