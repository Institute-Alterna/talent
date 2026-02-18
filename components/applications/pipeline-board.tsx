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
import { StageBadge } from './stage-badge';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

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

// Stage color map for top accent bars
const STAGE_COLORS: Record<Stage, string> = {
  APPLICATION: '#64748b',
  GENERAL_COMPETENCIES: '#7c3aed',
  SPECIALIZED_COMPETENCIES: '#4f46e5',
  INTERVIEW: '#d97706',
  AGREEMENT: '#0891b2',
  SIGNED: '#16a34a',
};

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
      {/* Colored top bar */}
      <div
        className="absolute top-0 left-3 right-3 h-[2px] rounded-full"
        style={{ backgroundColor: STAGE_COLORS[stage] }}
      />
      
      {/* Column header */}
      <div className="relative p-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-1">
          <StageBadge stage={stage} size="sm" />
          <span className="inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-muted text-xs font-medium px-1.5">
            {count}
          </span>
        </div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {stage.replace(/_/g, ' ')}
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
  if (isLoading) {
    return <PipelineSkeleton />;
  }

  return (
    <ScrollArea className={cn('w-full snap-x snap-mandatory', className)}>
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
