'use client';

/**
 * Application Card Component
 *
 * Displays a compact card for an application in the pipeline board.
 * Shows person name, position, date, and quick actions.
 */

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './status-badge';
import { Stage, Status } from '@/lib/generated/prisma/client';
import { cn, formatDateShort } from '@/lib/utils';
import {
  Eye,
  Mail,
  MoreHorizontal,
  Calendar,
  AlertCircle,
  FileDown,
  Loader2,
  Ban,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { recruitment, formatScoreDisplay } from '@/config';

export interface ApplicationCardData {
  id: string;
  position: string;
  currentStage: Stage;
  status: Status;
  createdAt: Date | string;
  person: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    generalCompetenciesCompleted: boolean;
    generalCompetenciesScore: string | null;
  };
  missingFieldsCount?: number;
  hasCompletedInterview?: boolean;
  needsAttention?: boolean;
}

interface ApplicationCardProps {
  application: ApplicationCardData;
  onView: (id: string) => void;
  onSendEmail?: (id: string) => void;
  onScheduleInterview?: (id: string) => void;
  onExportPdf?: (id: string) => void;
  onWithdraw?: (id: string) => void;
  isExportingPdf?: boolean;
  isAdmin?: boolean;
  className?: string;
}

// Use shared `formatDate` from '@/lib/utils' (D MMMM YYYY)


/* 
Uncomment if you wish to use avatar initials
function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
} */

export function ApplicationCard({
  application,
  onView,
  onSendEmail,
  onScheduleInterview,
  onExportPdf,
  onWithdraw,
  isExportingPdf = false,
  isAdmin = false,
  className,
}: ApplicationCardProps) {
  const { person } = application;
  const hasMissingFields = (application.missingFieldsCount || 0) > 0;

  return (
    <Card
      className={cn(
        'cursor-pointer hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 border-border/50 py-3 min-h-[160px] flex flex-col',
        application.status !== 'ACTIVE' && 'opacity-60 grayscale',
        application.needsAttention && 'border-l-[3px] border-l-amber-500 dark:border-l-amber-400',
        className
      )}
      onClick={() => onView(application.id)}
    >
      <CardContent className="px-3 flex flex-col flex-1">
        {/* Header with name and status */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Avatar, uncomment if you wish to use it */}
            {/* <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0">
              {getInitials(person.firstName, person.lastName)}
            </div> */}
            {/* Name and email */}
            <div className="min-w-0 max-w-[160px]">
              <p className="font-medium text-sm truncate" title={`${person.firstName} ${person.lastName}`}>
                {person.firstName} {person.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate" title={person.email}>
                {person.email}
              </p>
            </div>
          </div>
          {/* Status badge */}
          <StatusBadge status={application.status} size="sm" />
        </div>

        {/* Position */}
        <p className="text-sm text-foreground mb-2 truncate">
          {application.position}
        </p>

        {/* Footer with date and actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>{formatDateShort(application.createdAt)}</span>
            {hasMissingFields && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertCircle className="w-3 h-3 text-amber-500" />
                </TooltipTrigger>
                <TooltipContent>
                  {application.missingFieldsCount} missing field(s)
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onView(application.id)}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View details</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView(application.id)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                {onSendEmail && application.status === 'ACTIVE' && (
                  <DropdownMenuItem onClick={() => onSendEmail(application.id)}>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Email
                  </DropdownMenuItem>
                )}
                {onScheduleInterview &&
                 application.status === 'ACTIVE' &&
                 application.currentStage === 'INTERVIEW' && (
                  <DropdownMenuItem onClick={() => onScheduleInterview(application.id)}>
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule Interview
                  </DropdownMenuItem>
                )}
                {onExportPdf && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onExportPdf(application.id)}
                      disabled={isExportingPdf}
                    >
                      {isExportingPdf ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <FileDown className="mr-2 h-4 w-4" />
                      )}
                      {isExportingPdf ? 'Exporting...' : 'Export PDF'}
                    </DropdownMenuItem>
                  </>
                )}
                {onWithdraw && isAdmin && application.status === 'ACTIVE' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onWithdraw(application.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      Withdraw
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* GC Score indicator - always reserve space for consistent card height */}
        <div className="mt-auto pt-2 border-t">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">GC Score</span>
            {person.generalCompetenciesCompleted && person.generalCompetenciesScore ? (
              (() => {
                const { threshold, scale } = recruitment.assessmentThresholds.generalCompetencies;
                const score = parseFloat(person.generalCompetenciesScore);
                const scoreDisplay = formatScoreDisplay(score, scale);
                const passed = score >= threshold;
                return (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={cn(
                        'font-medium cursor-help',
                        passed ? 'text-green-600' : 'text-red-600'
                      )}>
                        {scoreDisplay.value}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{scoreDisplay.tooltip}</p>
                      <p className="text-xs text-muted-foreground">
                        Threshold: {threshold}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })()
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
