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
import { cn } from '@/lib/utils';
import {
  Eye,
  Mail,
  MoreHorizontal,
  Calendar,
  AlertCircle,
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
}

interface ApplicationCardProps {
  application: ApplicationCardData;
  onView: (id: string) => void;
  onSendEmail?: (id: string) => void;
  onScheduleInterview?: (id: string) => void;
  isAdmin?: boolean;
  className?: string;
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
    month: 'short',
    day: 'numeric',
  });
}

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
  isAdmin = false,
  className,
}: ApplicationCardProps) {
  const { person } = application;
  const hasMissingFields = (application.missingFieldsCount || 0) > 0;

  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-md transition-shadow py-3',
        application.status !== 'ACTIVE' && 'opacity-60',
        className
      )}
      onClick={() => onView(application.id)}
    >
      <CardContent className="px-3">
        {/* Header with name and status */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Avatar, uncomment if you wish to use it */}
            {/* <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0">
              {getInitials(person.firstName, person.lastName)}
            </div> */}
            {/* Name and email */}
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">
                {person.firstName} {person.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
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
            <span>{formatDate(application.createdAt)}</span>
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
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* GC Score indicator (if completed) */}
        {person.generalCompetenciesCompleted && person.generalCompetenciesScore && (
          <div className="mt-2 pt-2 border-t">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">GC Score</span>
              <span className={cn(
                'font-medium',
                parseFloat(person.generalCompetenciesScore) >= 70
                  ? 'text-green-600'
                  : 'text-red-600'
              )}>
                {parseFloat(person.generalCompetenciesScore).toFixed(0)}%
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
