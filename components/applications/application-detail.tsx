'use client';

/**
 * Application Detail Component
 *
 * Displays full application details in a dialog/modal with tabs:
 * 1. Application - Personal info, documents, position
 * 2. Assessments - GC and SC scores
 * 3. Interview - Interview scheduling and notes
 * 4. Decision - Final hiring decision
 * 5. Activity - Audit trail timeline
 */

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from './status-badge';
import { StageBadge } from './stage-badge';
import { Timeline, TimelineItem, mapActionTypeToTimelineType } from '@/components/ui/timeline';
import { Stage, Status } from '@/lib/generated/prisma/client';
import { cn } from '@/lib/utils';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Link as LinkIcon,
  GraduationCap,
  FileText,
  Video,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Clock,
} from 'lucide-react';

/**
 * Application detail data structure
 */
export interface ApplicationDetailData {
  id: string;
  position: string;
  currentStage: Stage;
  status: Status;
  createdAt: string;
  updatedAt: string;
  resumeUrl: string | null;
  academicBackground: string | null;
  previousExperience: string | null;
  videoLink: string | null;
  otherFileUrl: string | null;
  hasResume: boolean;
  hasAcademicBg: boolean;
  hasVideoIntro: boolean;
  hasPreviousExp: boolean;
  hasOtherFile: boolean;
  person: {
    id: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    email: string;
    secondaryEmail: string | null;
    phoneNumber: string | null;
    country: string | null;
    city: string | null;
    state: string | null;
    countryCode: string | null;
    portfolioLink: string | null;
    educationLevel: string | null;
    generalCompetenciesCompleted: boolean;
    generalCompetenciesScore: string | null;
    generalCompetenciesPassedAt: string | null;
  };
  assessments: Array<{
    id: string;
    assessmentType: string;
    score: string;
    passed: boolean;
    threshold: string;
    completedAt: string;
  }>;
  interviews: Array<{
    id: string;
    interviewerId: string;
    schedulingLink: string;
    scheduledAt: string | null;
    completedAt: string | null;
    notes: string | null;
    outcome: string;
    interviewer?: {
      id: string;
      displayName: string;
      email: string;
    };
  }>;
  decisions: Array<{
    id: string;
    decision: string;
    reason: string;
    notes: string | null;
    decidedAt: string;
    user?: {
      id: string;
      displayName: string;
    };
  }>;
}

interface ApplicationDetailProps {
  application: ApplicationDetailData | null;
  auditLogs?: Array<{
    id: string;
    action: string;
    actionType: string;
    createdAt: string;
    user?: { displayName: string } | null;
  }>;
  isOpen: boolean;
  onClose: () => void;
  onSendEmail?: (templateName: string) => void;
  onScheduleInterview?: () => void;
  onMakeDecision?: (decision: 'ACCEPT' | 'REJECT') => void;
  isAdmin?: boolean;
  isLoading?: boolean;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Missing fields indicator
 */
function MissingFieldsAlert({ application }: { application: ApplicationDetailData }) {
  const missingFields: string[] = [];

  if (application.hasResume && !application.resumeUrl) {
    missingFields.push('Resume');
  }
  if (application.hasAcademicBg && !application.academicBackground) {
    missingFields.push('Academic Background');
  }
  if (application.hasVideoIntro && !application.videoLink) {
    missingFields.push('Video Introduction');
  }
  if (application.hasPreviousExp && !application.previousExperience) {
    missingFields.push('Previous Experience');
  }
  if (application.hasOtherFile && !application.otherFileUrl) {
    missingFields.push('Other File');
  }

  if (missingFields.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-amber-800 text-sm">Missing Documents</p>
          <p className="text-amber-700 text-sm mt-1">
            The applicant indicated they would submit: {missingFields.join(', ')}, but these were not received.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Application Info Tab
 */
function ApplicationTab({ application }: { application: ApplicationDetailData }) {
  const { person } = application;

  return (
    <div className="space-y-6">
      <MissingFieldsAlert application={application} />

      {/* Personal Information */}
      <div>
        <h4 className="font-medium text-sm text-muted-foreground mb-3">Personal Information</h4>
        <div className="grid grid-cols-2 gap-4">
          <InfoItem icon={User} label="Full Name">
            {person.firstName} {person.middleName} {person.lastName}
          </InfoItem>
          <InfoItem icon={Mail} label="Email">
            <a href={`mailto:${person.email}`} className="text-primary hover:underline">
              {person.email}
            </a>
          </InfoItem>
          {person.secondaryEmail && (
            <InfoItem icon={Mail} label="Secondary Email">
              <a href={`mailto:${person.secondaryEmail}`} className="text-primary hover:underline">
                {person.secondaryEmail}
              </a>
            </InfoItem>
          )}
          {person.phoneNumber && (
            <InfoItem icon={Phone} label="Phone">
              {person.phoneNumber}
            </InfoItem>
          )}
          {(person.city || person.state || person.country) && (
            <InfoItem icon={MapPin} label="Location">
              {[person.city, person.state, person.country].filter(Boolean).join(', ')}
            </InfoItem>
          )}
          {person.portfolioLink && (
            <InfoItem icon={LinkIcon} label="Portfolio">
              <a
                href={person.portfolioLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
              >
                View Portfolio <ExternalLink className="h-3 w-3" />
              </a>
            </InfoItem>
          )}
          {person.educationLevel && (
            <InfoItem icon={GraduationCap} label="Education">
              {person.educationLevel}
            </InfoItem>
          )}
        </div>
      </div>

      <Separator />

      {/* Application Documents */}
      <div>
        <h4 className="font-medium text-sm text-muted-foreground mb-3">Application Documents</h4>
        <div className="space-y-3">
          {application.resumeUrl && (
            <DocumentLink
              icon={FileText}
              label="Resume"
              url={application.resumeUrl}
            />
          )}
          {application.videoLink && (
            <DocumentLink
              icon={Video}
              label="Video Introduction"
              url={application.videoLink}
            />
          )}
          {application.otherFileUrl && (
            <DocumentLink
              icon={FileText}
              label="Other File"
              url={application.otherFileUrl}
            />
          )}
        </div>

        {application.academicBackground && (
          <div className="mt-4">
            <label className="text-sm font-medium text-muted-foreground">Academic Background</label>
            <p className="mt-1 text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-3">
              {application.academicBackground}
            </p>
          </div>
        )}

        {application.previousExperience && (
          <div className="mt-4">
            <label className="text-sm font-medium text-muted-foreground">Previous Experience</label>
            <p className="mt-1 text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-3">
              {application.previousExperience}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Assessments Tab
 */
function AssessmentsTab({
  application,
  onSendEmail,
}: {
  application: ApplicationDetailData;
  onSendEmail?: (template: string) => void;
}) {
  const { person, assessments } = application;

  const gcAssessment = assessments.find(a => a.assessmentType === 'GENERAL_COMPETENCIES');
  const scAssessment = assessments.find(a => a.assessmentType === 'SPECIALIZED_COMPETENCIES');

  return (
    <div className="space-y-6">
      {/* General Competencies */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium">General Competencies</h4>
          {person.generalCompetenciesCompleted ? (
            <Badge variant={parseFloat(person.generalCompetenciesScore || '0') >= 70 ? 'default' : 'destructive'}>
              {parseFloat(person.generalCompetenciesScore || '0') >= 70 ? (
                <><CheckCircle className="h-3 w-3 mr-1" /> Passed</>
              ) : (
                <><XCircle className="h-3 w-3 mr-1" /> Failed</>
              )}
            </Badge>
          ) : (
            <Badge variant="secondary">
              <Clock className="h-3 w-3 mr-1" /> Pending
            </Badge>
          )}
        </div>

        {person.generalCompetenciesCompleted ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Score</span>
              <span className="font-medium">{parseFloat(person.generalCompetenciesScore || '0').toFixed(1)}%</span>
            </div>
            {person.generalCompetenciesPassedAt && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Completed</span>
                <span>{formatDate(person.generalCompetenciesPassedAt)}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Assessment not yet completed
            </p>
            {onSendEmail && (
              <Button
                size="sm"
                onClick={() => onSendEmail('general-competencies-invitation')}
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Assessment Link
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Specialized Competencies */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium">Specialized Competencies</h4>
          {scAssessment ? (
            <Badge variant={scAssessment.passed ? 'default' : 'destructive'}>
              {scAssessment.passed ? (
                <><CheckCircle className="h-3 w-3 mr-1" /> Passed</>
              ) : (
                <><XCircle className="h-3 w-3 mr-1" /> Failed</>
              )}
            </Badge>
          ) : (
            <Badge variant="secondary">
              <Clock className="h-3 w-3 mr-1" /> Pending
            </Badge>
          )}
        </div>

        {scAssessment ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Score</span>
              <span className="font-medium">{parseFloat(scAssessment.score).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Threshold</span>
              <span>{parseFloat(scAssessment.threshold).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Completed</span>
              <span>{formatDate(scAssessment.completedAt)}</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              {person.generalCompetenciesCompleted && parseFloat(person.generalCompetenciesScore || '0') >= 70
                ? 'Ready for specialized assessment'
                : 'Complete General Competencies first'}
            </p>
            {onSendEmail && person.generalCompetenciesCompleted && parseFloat(person.generalCompetenciesScore || '0') >= 70 && (
              <Button
                size="sm"
                onClick={() => onSendEmail('specialized-competencies-invitation')}
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Assessment Link
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Interview Tab
 */
function InterviewTab({
  application,
  onScheduleInterview,
}: {
  application: ApplicationDetailData;
  onScheduleInterview?: () => void;
}) {
  const latestInterview = application.interviews[0];

  return (
    <div className="space-y-6">
      {latestInterview ? (
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">Interview Details</h4>
            <Badge variant={
              latestInterview.outcome === 'ACCEPT' ? 'default' :
              latestInterview.outcome === 'REJECT' ? 'destructive' :
              'secondary'
            }>
              {latestInterview.outcome === 'ACCEPT' ? 'Accepted' :
               latestInterview.outcome === 'REJECT' ? 'Rejected' :
               'Pending'}
            </Badge>
          </div>

          <div className="space-y-3">
            {latestInterview.interviewer && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Interviewer</span>
                <span>{latestInterview.interviewer.displayName}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Scheduling Link</span>
              <a
                href={latestInterview.schedulingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
              >
                Book Interview <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            {latestInterview.scheduledAt && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Scheduled</span>
                <span>{formatDateTime(latestInterview.scheduledAt)}</span>
              </div>
            )}
            {latestInterview.completedAt && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Completed</span>
                <span>{formatDateTime(latestInterview.completedAt)}</span>
              </div>
            )}
          </div>

          {latestInterview.notes && (
            <div className="mt-4">
              <label className="text-sm font-medium text-muted-foreground">Interview Notes</label>
              <p className="mt-1 text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-3">
                {latestInterview.notes}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 border rounded-lg">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">No interview scheduled yet</p>
          {onScheduleInterview && application.currentStage === 'INTERVIEW' && (
            <Button onClick={onScheduleInterview}>
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Interview
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Decision Tab
 */
function DecisionTab({
  application,
  onMakeDecision,
  isAdmin,
}: {
  application: ApplicationDetailData;
  onMakeDecision?: (decision: 'ACCEPT' | 'REJECT') => void;
  isAdmin?: boolean;
}) {
  const latestDecision = application.decisions[0];

  return (
    <div className="space-y-6">
      {latestDecision ? (
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">Hiring Decision</h4>
            <Badge variant={latestDecision.decision === 'ACCEPT' ? 'default' : 'destructive'}>
              {latestDecision.decision === 'ACCEPT' ? (
                <><CheckCircle className="h-3 w-3 mr-1" /> Accepted</>
              ) : (
                <><XCircle className="h-3 w-3 mr-1" /> Rejected</>
              )}
            </Badge>
          </div>

          <div className="space-y-3">
            {latestDecision.user && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Decided By</span>
                <span>{latestDecision.user.displayName}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Decision Date</span>
              <span>{formatDateTime(latestDecision.decidedAt)}</span>
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium text-muted-foreground">Reason</label>
            <p className="mt-1 text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-3">
              {latestDecision.reason}
            </p>
          </div>

          {latestDecision.notes && (
            <div className="mt-4">
              <label className="text-sm font-medium text-muted-foreground">Additional Notes</label>
              <p className="mt-1 text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-3">
                {latestDecision.notes}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 border rounded-lg">
          <p className="text-muted-foreground mb-4">
            No decision has been made yet
          </p>
          {isAdmin && onMakeDecision && application.status === 'ACTIVE' && (
            <div className="flex justify-center gap-3">
              <Button
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => onMakeDecision('REJECT')}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={() => onMakeDecision('ACCEPT')}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Accept
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Activity Tab
 */
function ActivityTab({ auditLogs }: { auditLogs?: ApplicationDetailProps['auditLogs'] }) {
  const timelineItems: TimelineItem[] = (auditLogs || []).map(log => ({
    id: log.id,
    title: log.action,
    timestamp: log.createdAt,
    type: mapActionTypeToTimelineType(log.actionType),
    user: log.user ? { name: log.user.displayName } : undefined,
  }));

  return (
    <Timeline
      items={timelineItems}
      emptyMessage="No activity recorded yet"
    />
  );
}

/**
 * Helper components
 */
function InfoItem({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm break-words">{children}</p>
      </div>
    </div>
  );
}

function DocumentLink({
  icon: Icon,
  label,
  url,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  url: string;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/50 transition-colors"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm flex-1">{label}</span>
      <ExternalLink className="h-3 w-3 text-muted-foreground" />
    </a>
  );
}

/**
 * Main Application Detail Component
 */
export function ApplicationDetail({
  application,
  auditLogs,
  isOpen,
  onClose,
  onSendEmail,
  onScheduleInterview,
  onMakeDecision,
  isAdmin = false,
  isLoading = false,
}: ApplicationDetailProps) {
  if (!application) return null;

  const { person } = application;
  const fullName = [person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl">{fullName}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                {application.position}
                <span className="text-muted-foreground">•</span>
                <span>Applied {formatDate(application.createdAt)}</span>
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <StageBadge stage={application.currentStage} />
              <StatusBadge status={application.status} />
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="application" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="application">Application</TabsTrigger>
            <TabsTrigger value="assessments">Assessments</TabsTrigger>
            <TabsTrigger value="interview">Interview</TabsTrigger>
            <TabsTrigger value="decision">Decision</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="application" className="mt-0 px-1">
              <ApplicationTab application={application} />
            </TabsContent>

            <TabsContent value="assessments" className="mt-0 px-1">
              <AssessmentsTab application={application} onSendEmail={onSendEmail} />
            </TabsContent>

            <TabsContent value="interview" className="mt-0 px-1">
              <InterviewTab application={application} onScheduleInterview={onScheduleInterview} />
            </TabsContent>

            <TabsContent value="decision" className="mt-0 px-1">
              <DecisionTab
                application={application}
                onMakeDecision={onMakeDecision}
                isAdmin={isAdmin}
              />
            </TabsContent>

            <TabsContent value="activity" className="mt-0 px-1">
              <ActivityTab auditLogs={auditLogs} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
