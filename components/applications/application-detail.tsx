'use client';

/**
 * Application Detail Component
 *
 * Displays full application details in a dialog/modal with 70/30 split layout:
 * - Left (70%): Personal info, documents, academic background, previous experience, activity timeline
 * - Right (30%): Assessments, interview, decision
 *
 * Shows loading skeleton immediately for instant feedback, then populates content.
 */

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from './status-badge';
import { StageBadge } from './stage-badge';
import { Timeline, TimelineItem, mapActionTypeToTimelineType } from '@/components/ui/timeline';
import { Stage, Status } from '@/lib/generated/prisma/client';
import { formatDateShort, formatDateTime, getCountryName } from '@/lib/utils';
import { recruitment, formatScoreDisplay, strings } from '@/config';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  Loader2,
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
    emailSentAt: string | null;
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
  onRescheduleInterview?: () => void;
  onCompleteInterview?: () => void;
  onMakeDecision?: (decision: 'ACCEPT' | 'REJECT') => void;
  isAdmin?: boolean;
  isLoading?: boolean;
  sendingEmailTemplate?: string | null;
  isSchedulingInterview?: boolean;
  isReschedulingInterview?: boolean;
  isCompletingInterview?: boolean;
  isDecisionProcessing?: boolean;
}

/**
 * Loading skeleton for the entire detail view
 */
function DetailSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Left Panel Skeleton */}
      <div className="flex-1 lg:w-[70%] space-y-6">
        {/* Personal Info Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-5 w-32" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <Skeleton className="h-px w-full" />

        {/* Documents Skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>

        <Skeleton className="h-px w-full" />

        {/* Text Areas Skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>

      {/* Right Panel Skeleton */}
      <div className="lg:w-[30%] lg:min-w-[280px] space-y-6">
        {/* Assessment Skeleton */}
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Interview Skeleton */}
        <div className="border rounded-lg p-4 space-y-3">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        {/* Decision Skeleton */}
        <div className="border rounded-lg p-4 space-y-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    </div>
  );
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="font-medium text-sm text-muted-foreground mb-3">{children}</h4>
  );
}

/**
 * Left Panel Content - Personal Info, Documents, Background, Activity
 */
function LeftPanel({
  application,
  auditLogs,
}: {
  application: ApplicationDetailData;
  auditLogs?: ApplicationDetailProps['auditLogs'];
}) {
  const { person } = application;

  const timelineItems: TimelineItem[] = (auditLogs || []).map(log => ({
    id: log.id,
    title: log.action,
    timestamp: log.createdAt,
    type: mapActionTypeToTimelineType(log.actionType),
    user: log.user ? { name: log.user.displayName } : undefined,
  }));

  const hasDocuments = application.resumeUrl || application.videoLink || application.otherFileUrl;

  return (
    <div className="space-y-6">
      <MissingFieldsAlert application={application} />

      {/* Personal Information */}
      <div>
        <SectionTitle>Personal Information</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              {[
                person.city,
                person.state,
                person.country && person.country.length === 2
                  ? getCountryName(person.country)
                  : person.country,
              ].filter(Boolean).join(', ')}
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

      {/* Documents */}
      {hasDocuments && (
        <>
          <Separator />
          <div>
            <SectionTitle>Documents</SectionTitle>
            <div className="space-y-2">
              {application.resumeUrl && (
                <DocumentLink icon={FileText} label="Resume" url={application.resumeUrl} />
              )}
              {application.videoLink && (
                <DocumentLink icon={Video} label="Video Introduction" url={application.videoLink} />
              )}
              {application.otherFileUrl && (
                <DocumentLink icon={FileText} label="Other File" url={application.otherFileUrl} />
              )}
            </div>
          </div>
        </>
      )}

      {/* Academic Background */}
      {application.academicBackground && (
        <>
          <Separator />
          <div>
            <SectionTitle>Academic Background</SectionTitle>
            <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-3">
              {application.academicBackground}
            </p>
          </div>
        </>
      )}

      {/* Previous Experience */}
      {application.previousExperience && (
        <>
          <Separator />
          <div>
            <SectionTitle>Previous Experience</SectionTitle>
            <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded-lg p-3">
              {application.previousExperience}
            </p>
          </div>
        </>
      )}

      {/* Activity Timeline */}
      <Separator />
      <div>
        <SectionTitle>Activity</SectionTitle>
        {timelineItems.length > 0 ? (
          <Timeline items={timelineItems} />
        ) : (
          <p className="text-sm text-muted-foreground">No activity recorded yet</p>
        )}
      </div>
    </div>
  );
}

/**
 * Right Panel Content - Assessments, Interview, Decision
 */
function RightPanel({
  application,
  onSendEmail,
  onScheduleInterview,
  onRescheduleInterview,
  onCompleteInterview,
  onMakeDecision,
  isAdmin,
  sendingEmailTemplate,
  isSchedulingInterview,
  isReschedulingInterview,
  isCompletingInterview,
  isDecisionProcessing,
}: {
  application: ApplicationDetailData;
  onSendEmail?: (template: string) => void;
  onScheduleInterview?: () => void;
  onRescheduleInterview?: () => void;
  onCompleteInterview?: () => void;
  onMakeDecision?: (decision: 'ACCEPT' | 'REJECT') => void;
  isAdmin?: boolean;
  sendingEmailTemplate?: string | null;
  isSchedulingInterview?: boolean;
  isReschedulingInterview?: boolean;
  isCompletingInterview?: boolean;
  isDecisionProcessing?: boolean;
}) {
  const { person, assessments, interviews, decisions } = application;

  const scAssessment = assessments.find(a => a.assessmentType === 'SPECIALIZED_COMPETENCIES');
  const latestInterview = interviews[0];
  const latestDecision = decisions[0];

  // Track if any operation is in progress
  const isAnyOperationInProgress = sendingEmailTemplate !== null || 
    isSchedulingInterview === true || 
    isReschedulingInterview === true || 
    isCompletingInterview === true || 
    isDecisionProcessing === true;

  return (
    <div className="space-y-4">
      {/* General Competencies */}
      <div className="border rounded-lg p-4">
        {(() => {
          const { threshold, scale } = recruitment.assessmentThresholds.generalCompetencies;
          const score = parseFloat(person.generalCompetenciesScore || '0');
          const passed = score >= threshold;
          const scoreDisplay = formatScoreDisplay(person.generalCompetenciesScore, scale);
          const isActionable = application.status === 'ACTIVE';

          return (
            <>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm">General Competencies</h4>
                {person.generalCompetenciesCompleted ? (
                  <Badge variant={passed ? 'default' : 'destructive'} className="text-xs">
                    {passed ? (
                      <><CheckCircle className="h-3 w-3 mr-1" /> Passed</>
                    ) : (
                      <><XCircle className="h-3 w-3 mr-1" /> Failed</>
                    )}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" /> Pending
                  </Badge>
                )}
              </div>

              {person.generalCompetenciesCompleted ? (
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Score</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="font-medium cursor-help">{scoreDisplay.value}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{scoreDisplay.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Threshold</span>
                    <span>{threshold}</span>
                  </div>
                  {person.generalCompetenciesPassedAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Completed</span>
                      <span>{formatDateShort(person.generalCompetenciesPassedAt)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-2">
                  {isActionable ? (
                    <>
                      <p className="text-xs text-muted-foreground mb-2">Not yet completed</p>
                      {onSendEmail && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs h-7" 
                          onClick={() => onSendEmail('general-competencies-invitation')}
                          disabled={isAnyOperationInProgress}
                        >
                          {sendingEmailTemplate === 'general-competencies-invitation' ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Mail className="h-3 w-3 mr-1" />
                              Send Link
                            </>
                          )}
                        </Button>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      {strings.statuses.applicationRejected}
                    </p>
                  )}
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Specialized Competencies */}
      <div className="border rounded-lg p-4">
        {(() => {
          const gcConfig = recruitment.assessmentThresholds.generalCompetencies;
          const scConfig = recruitment.assessmentThresholds.specializedCompetencies;
          const gcScore = parseFloat(person.generalCompetenciesScore || '0');
          const gcPassed = gcScore >= gcConfig.threshold;
          const isActionable = application.status === 'ACTIVE';

          return (
            <>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm">Specialized Competencies</h4>
                {scAssessment ? (
                  <Badge variant={scAssessment.passed ? 'default' : 'destructive'} className="text-xs">
                    {scAssessment.passed ? (
                      <><CheckCircle className="h-3 w-3 mr-1" /> Passed</>
                    ) : (
                      <><XCircle className="h-3 w-3 mr-1" /> Failed</>
                    )}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" /> Pending
                  </Badge>
                )}
              </div>

              {scAssessment ? (
                (() => {
                  const scoreDisplay = formatScoreDisplay(scAssessment.score, scConfig.scale);
                  return (
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Score</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="font-medium cursor-help">{scoreDisplay.value}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{scoreDisplay.tooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Threshold</span>
                        <span>{scConfig.threshold}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Completed</span>
                        <span>{formatDateShort(scAssessment.completedAt)}</span>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-2">
                  {isActionable ? (
                    <>
                      {!person.generalCompetenciesCompleted ? (
                        <p className="text-xs text-muted-foreground opacity-60">
                          {strings.interview.gcNotCompleted}
                        </p>
                      ) : !gcPassed ? (
                        <p className="text-xs text-muted-foreground opacity-60">
                          {strings.interview.gcFailed}
                        </p>
                      ) : (
                        <>
                          <p className="text-xs text-muted-foreground mb-2">
                            Ready for assessment
                          </p>
                          {onSendEmail && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-xs h-7" 
                              onClick={() => onSendEmail('specialized-competencies-invitation')}
                              disabled={isAnyOperationInProgress}
                            >
                              {sendingEmailTemplate === 'specialized-competencies-invitation' ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Mail className="h-3 w-3 mr-1" />
                                  Send Link
                                </>
                              )}
                            </Button>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      {strings.statuses.applicationRejected}
                    </p>
                  )}
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Interview */}
      <div className="border rounded-lg p-4">
        {(() => {
          const gcConfig = recruitment.assessmentThresholds.generalCompetencies;
          const gcScore = parseFloat(person.generalCompetenciesScore || '0');
          const gcPassed = gcScore >= gcConfig.threshold;
          const gcFailed = person.generalCompetenciesCompleted && !gcPassed;
          const isActionable = application.status === 'ACTIVE';
          const canScheduleInterview = person.generalCompetenciesCompleted && gcPassed;
          const isInterviewCompleted = latestInterview?.completedAt !== null;

          return (
            <>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm">Interview</h4>
                {latestInterview ? (
                  isInterviewCompleted ? (
                    <Badge variant="default" className="text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" /> Completed
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" /> Scheduled
                    </Badge>
                  )
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" /> Not Scheduled
                  </Badge>
                )}
              </div>

              {latestInterview ? (
                <div className="space-y-2">
                  {latestInterview.interviewer && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Interviewer</span>
                      <span className="text-right">{latestInterview.interviewer.displayName}</span>
                    </div>
                  )}
                  {latestInterview.emailSentAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Invited</span>
                      <span className="text-right">{formatDateTime(latestInterview.emailSentAt)}</span>
                    </div>
                  )}
                  {latestInterview.completedAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Completed</span>
                      <span className="text-right">{formatDateTime(latestInterview.completedAt)}</span>
                    </div>
                  )}
                  {latestInterview.notes && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded p-2">
                        {latestInterview.notes}
                      </p>
                    </div>
                  )}
                  
                  {/* Actions for scheduled but not completed interview */}
                  {!isInterviewCompleted && isActionable && (
                    <div className="flex gap-2 pt-2">
                      {onRescheduleInterview && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 flex-1"
                          onClick={onRescheduleInterview}
                          disabled={isAnyOperationInProgress}
                        >
                          {isReschedulingInterview ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Calendar className="h-3 w-3 mr-1" />
                          )}
                          Reschedule
                        </Button>
                      )}
                      {onCompleteInterview && (
                        <Button
                          size="sm"
                          variant="default"
                          className="text-xs h-7 flex-1"
                          onClick={onCompleteInterview}
                          disabled={isAnyOperationInProgress}
                        >
                          {isCompletingInterview ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          )}
                          Complete
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-2">
                  {isActionable ? (
                    <>
                      {gcFailed ? (
                        <p className="text-xs text-muted-foreground opacity-60">
                          {strings.interview.gcFailed}
                        </p>
                      ) : !person.generalCompetenciesCompleted ? (
                        <p className="text-xs text-muted-foreground opacity-60">
                          {strings.interview.gcNotCompleted}
                        </p>
                      ) : canScheduleInterview ? (
                        <>
                          <p className="text-xs text-muted-foreground mb-2">
                            {strings.interview.noInterviewScheduled}
                          </p>
                          {onScheduleInterview && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-xs h-7" 
                              onClick={onScheduleInterview}
                              disabled={isAnyOperationInProgress}
                            >
                              {isSchedulingInterview ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <Calendar className="h-3 w-3 mr-1" />
                              )}
                              Schedule
                            </Button>
                          )}
                        </>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      {strings.statuses.applicationRejected}
                    </p>
                  )}
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* Decision */}
      <div className="border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-sm">Decision</h4>
          {latestDecision ? (
            <Badge variant={latestDecision.decision === 'ACCEPT' ? 'default' : 'destructive'} className="text-xs">
              {latestDecision.decision === 'ACCEPT' ? (
                <><CheckCircle className="h-3 w-3 mr-1" /> Accepted</>
              ) : (
                <><XCircle className="h-3 w-3 mr-1" /> Rejected</>
              )}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              <Clock className="h-3 w-3 mr-1" /> Pending
            </Badge>
          )}
        </div>

        {latestDecision ? (
          <div className="space-y-2">
            {latestDecision.user && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Decided By</span>
                <span className="text-right">{latestDecision.user.displayName}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date</span>
              <span className="text-right">{formatDateTime(latestDecision.decidedAt)}</span>
            </div>
            <div className="mt-2 pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Reason</p>
              <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded p-2">
                {latestDecision.reason}
              </p>
            </div>
            {latestDecision.notes && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">Notes</p>
                <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded p-2">
                  {latestDecision.notes}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-2">
            {isAdmin && onMakeDecision && application.status === 'ACTIVE' && (() => {
              const gcConfig = recruitment.assessmentThresholds.generalCompetencies;
              const gcScore = parseFloat(person.generalCompetenciesScore || '0');
              const gcPassed = person.generalCompetenciesCompleted && gcScore >= gcConfig.threshold;
              const gcNotCompleted = !person.generalCompetenciesCompleted;
              const gcFailed = person.generalCompetenciesCompleted && !gcPassed;

              if (gcNotCompleted) {
                // GC not completed - show message, no buttons
                return (
                  <p className="text-xs text-muted-foreground opacity-60">
                    {strings.interview.gcNotCompleted}
                  </p>
                );
              }

              if (gcFailed) {
                // GC failed - only show Reject button
                return (
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-xs text-muted-foreground opacity-60">
                      {strings.interview.gcFailed}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => onMakeDecision('REJECT')}
                      disabled={isAnyOperationInProgress}
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Reject
                    </Button>
                  </div>
                );
              }

              // Normal flow - show both buttons
              return (
                <>
                  <p className="text-xs text-muted-foreground mb-2">No decision yet</p>
                  <div className="flex justify-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => onMakeDecision('REJECT')}
                      disabled={isAnyOperationInProgress}
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => onMakeDecision('ACCEPT')}
                      disabled={isAnyOperationInProgress}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Accept
                    </Button>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
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
  onRescheduleInterview,
  onCompleteInterview,
  onMakeDecision,
  isAdmin = false,
  isLoading = false,
  sendingEmailTemplate,
  isSchedulingInterview,
  isReschedulingInterview,
  isCompletingInterview,
  isDecisionProcessing,
}: ApplicationDetailProps) {
  // Always render the dialog when open - show skeleton while loading
  const showSkeleton = isLoading || !application;

  // Get display data (use application data or placeholder for header)
  const displayName = application
    ? [application.person.firstName, application.person.middleName, application.person.lastName].filter(Boolean).join(' ')
    : 'Loading...';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-6xl h-[90vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <DialogTitle className="text-2xl font-bold">
                {showSkeleton ? 'Loading...' : displayName}
              </DialogTitle>
              {/* Use div instead of DialogDescription when loading to avoid div-in-p hydration error */}
              {showSkeleton ? (
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-muted-foreground text-sm">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : (
                <DialogDescription className="flex flex-wrap items-center gap-2 mt-1.5">
                  <StageBadge stage={application.currentStage} />
                  <StatusBadge status={application.status} />
                  <span className="text-muted-foreground">•</span>
                  <span>{application.position}</span>
                  <span className="text-muted-foreground">•</span>
                  <span>Applied {formatDateShort(application.createdAt)}</span>
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Content - 70/30 Split */}
        <div className="flex-1 overflow-hidden">
          {showSkeleton ? (
            <div className="p-6 h-full">
              <DetailSkeleton />
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row h-full">
              {/* Left Panel - 70% */}
              <ScrollArea className="flex-1 lg:w-[70%]">
                <div className="p-6">
                  <LeftPanel application={application} auditLogs={auditLogs} />
                </div>
              </ScrollArea>

              {/* Right Panel - 30% */}
              <div className="lg:w-[30%] lg:min-w-[300px] border-t lg:border-t-0 lg:border-l bg-muted/30">
                <ScrollArea className="h-full">
                  <div className="p-6">
                    <RightPanel
                      application={application}
                      onSendEmail={onSendEmail}
                      onScheduleInterview={onScheduleInterview}
                      onRescheduleInterview={onRescheduleInterview}
                      onCompleteInterview={onCompleteInterview}
                      onMakeDecision={onMakeDecision}
                      isAdmin={isAdmin}
                      sendingEmailTemplate={sendingEmailTemplate}
                      isSchedulingInterview={isSchedulingInterview}
                      isReschedulingInterview={isReschedulingInterview}
                      isCompletingInterview={isCompletingInterview}
                      isDecisionProcessing={isDecisionProcessing}
                    />
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
