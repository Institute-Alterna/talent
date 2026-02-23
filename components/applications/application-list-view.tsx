'use client';

/**
 * Application List View Component
 *
 * Compact responsive table for displaying applications in non-active statuses
 * (Accepted, Rejected). Designed for clarity over the kanban board.
 */

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StageBadge } from './stage-badge';
import { Badge } from '@/components/ui/badge';
import { Stage, Status } from '@/lib/generated/prisma/client';
import { cn, formatDateShort } from '@/lib/utils';
import { Eye, FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ApplicationListItem {
  id: string;
  personId: string;
  position: string;
  currentStage: Stage;
  status: Status;
  createdAt: Date | string;
  updatedAt: Date | string;
  person: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    generalCompetenciesCompleted: boolean;
    generalCompetenciesScore: string | null;
  };
  _count: {
    interviews: number;
    decisions: number;
  };
}

interface ApplicationListViewProps {
  applications: ApplicationListItem[];
  status: Status;
  onViewApplication: (id: string) => void;
  onExportPdf?: (id: string) => void;
  exportingPdfId?: string | null;
  isLoading?: boolean;
  className?: string;
}

const STATUS_LABELS: Record<Status, { label: string; className: string }> = {
  ACTIVE: {
    label: 'Active',
    className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  },
  ACCEPTED: {
    label: 'Accepted',
    className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  },
  REJECTED: {
    label: 'Rejected',
    className: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  },
};

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-14 bg-muted/30 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

/** Mobile card for each application row */
function ApplicationMobileCard({
  app,
  status,
  onView,
  onExportPdf,
  isExportingPdf,
}: {
  app: ApplicationListItem;
  status: Status;
  onView: (id: string) => void;
  onExportPdf?: (id: string) => void;
  isExportingPdf: boolean;
}) {
  const statusConfig = STATUS_LABELS[status];

  return (
    <div
      className="rounded-lg border bg-card p-3 cursor-pointer hover:bg-accent/50 transition-colors active:scale-[0.99]"
      onClick={() => onView(app.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onView(app.id); } }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">
            {app.person.firstName} {app.person.lastName}
          </p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {app.position}
          </p>
        </div>
        <Badge
          variant="outline"
          className={cn('text-[10px] px-1.5 py-0 shrink-0', statusConfig.className)}
        >
          {statusConfig.label}
        </Badge>
      </div>
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <StageBadge stage={app.currentStage} size="sm" />
          <span className="text-[11px] text-muted-foreground">
            {formatDateShort(app.createdAt)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {onExportPdf && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => { e.stopPropagation(); onExportPdf(app.id); }}
              disabled={isExportingPdf}
            >
              {isExportingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onView(app.id); }}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ApplicationListView({
  applications,
  status,
  onViewApplication,
  onExportPdf,
  exportingPdfId,
  isLoading = false,
  className,
}: ApplicationListViewProps) {
  const statusConfig = STATUS_LABELS[status];

  if (isLoading && applications.length === 0) {
    return <ListSkeleton />;
  }

  if (applications.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-sm">
          No {statusConfig.label.toLowerCase()} applications
        </p>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {isLoading && (
        <div className="absolute inset-0 z-10 bg-background/50 rounded-lg pointer-events-none animate-in fade-in duration-200" />
      )}

      {/* Desktop table */}
      <div className="hidden md:block rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[200px]">Candidate</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Stage Reached</TableHead>
              <TableHead>Applied</TableHead>
              <TableHead className="text-right w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {applications.map((app) => (
              <TableRow
                key={app.id}
                className="cursor-pointer"
                onClick={() => onViewApplication(app.id)}
              >
                <TableCell>
                  <div>
                    <p className="font-medium text-sm">
                      {app.person.firstName} {app.person.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{app.person.email}</p>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{app.position}</TableCell>
                <TableCell>
                  <StageBadge stage={app.currentStage} size="sm" />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDateShort(app.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {onExportPdf && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => { e.stopPropagation(); onExportPdf(app.id); }}
                        disabled={exportingPdfId === app.id}
                      >
                        {exportingPdfId === app.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <FileDown className="h-3.5 w-3.5 text-muted-foreground" />}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); onViewApplication(app.id); }}
                    >
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {applications.map((app) => (
          <ApplicationMobileCard
            key={app.id}
            app={app}
            status={status}
            onView={onViewApplication}
            onExportPdf={onExportPdf}
            isExportingPdf={exportingPdfId === app.id}
          />
        ))}
      </div>

      {/* Count footer */}
      <p className="text-xs text-muted-foreground mt-3 text-right">
        {applications.length} {applications.length === 1 ? 'application' : 'applications'}
      </p>
    </div>
  );
}
