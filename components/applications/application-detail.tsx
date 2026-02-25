'use client';

/**
 * Application Detail Component
 *
 * Responsive application detail view:
 * - Desktop (lg+): Dialog with 70/30 split layout
 * - Mobile: Bottom sheet drawer with tabbed navigation (Profile, Assessment, Activity)
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import { useMediaQuery } from '@/hooks';
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
  ClipboardList,
  ShieldAlert,
} from 'lucide-react';
import { GCQResponsesDialog } from './gcq-responses-dialog';
import { SCExplorerDialog } from './sc-explorer-dialog';
import { SCReviewDialog } from './sc-review-dialog';
import { GC_SUBSCORE_ENTRIES, extractGCSubscores, hasGCFields } from '@/lib/gc-utils';

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
    assessments?: Array<{
      id: string;
      score: string;
      passed: boolean;
      threshold: string;
      completedAt: string;
      rawData: unknown;
    }>;
  };
  assessments: Array<{
    id: string;
    assessmentType: string;
    score: string | null;
    passed: boolean | null;
    threshold: string | null;
    completedAt: string | null;
    specialisedCompetencyId: string | null;
    specialisedCompetency: {
      id: string;
      name: string;
      category: string;
      criterion: string;
    } | null;
    submissionUrls: Array<{ label: string; url: string; type: string }> | null;
    reviewedAt: string | null;
    reviewedBy: string | null;
    reviewer: { id: string; displayName: string } | null;
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
  agreementSignedAt: string | null;
  agreementData: {
    applicationId: string;
    legalFirstName: string;
    legalMiddleName?: string;
    legalLastName: string;
    preferredFirstName?: string;
    preferredLastName?: string;
    profilePictureUrl?: string;
    biography?: string;
    dateOfBirth?: string;
    country?: string;
    privacyPolicyAccepted?: boolean;
    signatureUrl?: string;
    entityRepresented?: string;
    serviceHours?: string;
  } | null;
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
  onWithdrawOffer?: () => void;
  isWithdrawingOffer?: boolean;
  onSendSCInvitation?: (competencyIds: string[]) => Promise<void>;
  isSendingSCInvitation?: boolean;
  onReviewSC?: (assessmentId: string, passed: boolean) => Promise<void>;
  isReviewingSC?: boolean;
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
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3 mb-4">
      <div className="flex items-start gap-2">
        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-amber-800 dark:text-amber-200 text-sm">Missing Documents</p>
          <p className="text-amber-700 dark:text-amber-200 text-sm mt-1">
            {missingFields.length === 1
              ? `${missingFields[0]} was expected but has not been received.`
              : `${missingFields.join(', ')} were expected but have not been received.`
            }
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
    <h4 className="uppercase tracking-wider text-[11px] font-medium text-muted-foreground mb-3">{children}</h4>
  );
}

/** Reusable send-email button used across pipeline cards. */
function SendEmailButton({
  template,
  onSendEmail,
  sendingEmailTemplate,
  disabled,
}: {
  template: string;
  onSendEmail?: (template: string) => void;
  sendingEmailTemplate?: string | null;
  disabled: boolean;
}) {
  if (!onSendEmail) return null;
  const isSending = sendingEmailTemplate === template;
  return (
    <Button
      size="sm"
      variant="outline"
      className="text-xs h-7"
      onClick={() => onSendEmail(template)}
      disabled={disabled}
    >
      {isSending ? (
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
  );
}

/** Button + lazy dialog for viewing full GCQ responses. */
function GCQViewResponsesButton({
  rawData,
  candidateName,
}: {
  rawData: unknown;
  candidateName?: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="text-xs h-7 mt-2 w-full"
        onClick={() => setOpen(true)}
      >
        <ClipboardList className="h-3 w-3 mr-1" />
        View Responses
      </Button>
      <GCQResponsesDialog
        rawData={rawData}
        open={open}
        onOpenChange={setOpen}
        candidateName={candidateName}
      />
    </>
  );
}

/** Convert audit logs to timeline items. */
function buildTimelineItems(auditLogs?: ApplicationDetailProps['auditLogs']): TimelineItem[] {
  return (auditLogs || []).map(log => ({
    id: log.id,
    title: log.action,
    timestamp: log.createdAt,
    type: mapActionTypeToTimelineType(log.actionType),
    user: log.user ? { name: log.user.displayName } : undefined,
  }));
}

/** Personal info, documents, academic background, experience — shared between desktop left panel and mobile profile tab. */
function ProfileContent({
  application,
  columns = 1,
}: {
  application: ApplicationDetailData;
  columns?: 1 | 2;
}) {
  const { person } = application;
  const hasDocuments = application.resumeUrl || application.videoLink || application.otherFileUrl;

  return (
    <div className="space-y-6">
      <MissingFieldsAlert application={application} />

      {/* Personal Information */}
      <div>
        <SectionTitle>Personal Information</SectionTitle>
        <div className={`grid grid-cols-1 ${columns === 2 ? 'sm:grid-cols-2' : ''} gap-4`}>
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
    </div>
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
  const timelineItems = buildTimelineItems(auditLogs);

  return (
    <div className="space-y-6">
      <ProfileContent application={application} columns={2} />

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
  onWithdrawOffer,
  isWithdrawingOffer,
  onSendSCInvitation,
  isSendingSCInvitation,
  onReviewSC,
  isReviewingSC,
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
  onWithdrawOffer?: () => void;
  isWithdrawingOffer?: boolean;
  onSendSCInvitation?: (competencyIds: string[]) => Promise<void>;
  isSendingSCInvitation?: boolean;
  onReviewSC?: (assessmentId: string, passed: boolean) => Promise<void>;
  isReviewingSC?: boolean;
}) {
  const { person, assessments, interviews, decisions } = application;

  const scAssessments = assessments.filter(a => a.assessmentType === 'SPECIALIZED_COMPETENCIES');
  const alreadyAssignedScIds = scAssessments
    .map(a => a.specialisedCompetencyId)
    .filter((id): id is string => id !== null);
  const latestInterview = interviews[0];
  // Withdrawal decisions are shown in the Agreement section, not the Decision section
  const withdrawalDecision = decisions.find(d => d.notes === 'Offer withdrawn at agreement stage');
  const latestDecision = decisions.find(d => d !== withdrawalDecision) ?? null;
  const isOfferWithdrawn = application.status === 'REJECTED' && application.currentStage === 'AGREEMENT' && !!withdrawalDecision;

  // --- Compute GC status once (used by all four cards) ---
  const gcConfig = recruitment.assessmentThresholds.generalCompetencies;
  // Prefer the threshold stored at assessment time over the current config value
  const gcAssessmentThreshold = person.assessments?.[0]?.threshold
    ? parseFloat(person.assessments[0].threshold)
    : gcConfig.threshold;
  const gcScore = parseFloat(person.generalCompetenciesScore || '0');
  const gcPassed = person.generalCompetenciesCompleted && gcScore >= gcAssessmentThreshold;
  const gcFailed = person.generalCompetenciesCompleted && !gcPassed;
  const gcNotCompleted = !person.generalCompetenciesCompleted;
  const gcScoreDisplay = formatScoreDisplay(person.generalCompetenciesScore, gcConfig.scale);
  const isActionable = application.status === 'ACTIVE';

  // Track if any operation is in progress
  const isAnyOperationInProgress = sendingEmailTemplate !== null ||
    isSchedulingInterview === true ||
    isReschedulingInterview === true ||
    isCompletingInterview === true ||
    isDecisionProcessing === true ||
    isWithdrawingOffer === true ||
    isSendingSCInvitation === true ||
    isReviewingSC === true;

  // SC explorer dialog state (local to RightPanel)
  const [isSCExplorerOpen, setIsSCExplorerOpen] = React.useState(false);

  // SC review dialog state (local to RightPanel)
  const [scReviewAssessment, setScReviewAssessment] = React.useState<typeof scAssessments[number] | null>(null);

  return (
    <div className="space-y-4">
      {/* General Competencies */}
      <div className="border rounded-lg p-4">
        {(() => {
          return (
            <>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-sm">General Competencies</h4>
                {person.generalCompetenciesCompleted ? (
                  <Badge variant={gcPassed ? 'default' : 'destructive'} className="text-xs">
                    {gcPassed ? (
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
                        <span className="font-medium cursor-help">{gcScoreDisplay.value}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{gcScoreDisplay.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Threshold</span>
                    <span>{gcConfig.threshold}</span>
                  </div>
                  {person.generalCompetenciesPassedAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Completed</span>
                      <span>{formatDateShort(person.generalCompetenciesPassedAt)}</span>
                    </div>
                  )}

                  {/* Sub-scores breakdown */}
                  {(() => {
                    const gcAssessment = person.assessments?.[0];
                    if (!gcAssessment?.rawData) return null;

                    const subscores = extractGCSubscores(gcAssessment.rawData);
                    if (!subscores) return null;

                    return (
                      <div className="border-t pt-2 mt-2 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Sub-scores</p>
                        {GC_SUBSCORE_ENTRIES.map(({ label, key }) => {
                          const val = subscores[key];
                          if (val === undefined) return null;
                          return (
                            <div key={key} className="flex justify-between text-xs">
                              <span className="text-muted-foreground">{label}</span>
                              <span className="font-medium">{String(val)}</span>
                            </div>
                          );
                        })}
                        {hasGCFields(gcAssessment.rawData) && (
                          <GCQViewResponsesButton
                            rawData={gcAssessment.rawData}
                            candidateName={[
                              person.firstName,
                              person.middleName,
                              person.lastName,
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          />
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-center py-2">
                  {isActionable ? (
                    <>
                      <p className="text-xs text-muted-foreground opacity-60 mb-2">Assessment not yet submitted</p>
                      <SendEmailButton
                        template="assessment/general-competencies-invitation"
                        onSendEmail={onSendEmail}
                        sendingEmailTemplate={sendingEmailTemplate}
                        disabled={isAnyOperationInProgress}
                      />
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
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
          const reviewedCount = scAssessments.filter(a => a.passed !== null).length;
          const totalCount = scAssessments.length;

          return (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm">Specialised Competencies</h4>
                  {totalCount > 0 && (
                    <Badge variant="outline" className="text-xs mx-1">
                      {reviewedCount}/{totalCount}
                    </Badge>
                  )}
                </div>
                {totalCount === 0 ? (
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" /> Pending
                  </Badge>
                ) : reviewedCount === totalCount ? (
                  <Badge variant={scAssessments.every(a => a.passed) ? 'default' : 'destructive'} className="text-xs">
                    {scAssessments.every(a => a.passed) ? (
                      <><CheckCircle className="h-3 w-3 mr-1" /> All Passed</>
                    ) : (
                      <><XCircle className="h-3 w-3 mr-1" /> Has Failures</>
                    )}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" /> In Progress
                  </Badge>
                )}
              </div>

              {/* SC assessment list */}
              {scAssessments.length > 0 && (
                <div className="space-y-3">
                  {scAssessments.map((sc) => {
                    const scName = sc.specialisedCompetency?.name || 'Unknown Competency';
                    const scCategory = sc.specialisedCompetency?.category;
                    const isAwaitingSubmission = sc.completedAt === null;
                    const isAwaitingReview = sc.completedAt !== null && sc.passed === null;
                    const isPassed = sc.passed === true;
                    const isFailed = sc.passed === false;

                    return (
                      <div key={sc.id} className="border rounded-md p-3 space-y-2">
                        {/* SC name + category + status */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className="text-sm font-medium">{scName}</span>
                            {scCategory && (
                              <Badge variant="outline" className="text-xs shrink-0">{scCategory}</Badge>
                            )}
                          </div>
                          <div className="shrink-0">
                            {isAwaitingSubmission && (
                              <Badge variant="secondary" className="text-xs">
                                <Clock className="h-3 w-3 mr-1" /> {strings.competencies.awaitingSubmission}
                              </Badge>
                            )}
                            {isAwaitingReview && (
                              <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                <AlertCircle className="h-3 w-3 mr-1" /> {strings.competencies.awaitingReview}
                              </Badge>
                            )}
                            {isPassed && (
                              <Badge variant="default" className="text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" /> Passed
                              </Badge>
                            )}
                            {isFailed && (
                              <Badge variant="destructive" className="text-xs">
                                <XCircle className="h-3 w-3 mr-1" /> Failed
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Submission URLs */}
                        {sc.completedAt && sc.submissionUrls && sc.submissionUrls.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {sc.submissionUrls.map((sub, idx) => (
                              <a
                                key={idx}
                                href={sub.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border hover:bg-muted/50 transition-colors text-primary"
                              >
                                <ExternalLink className="h-3 w-3" />
                                {sub.label}
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Completed date */}
                        {sc.completedAt && (
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Submitted</span>
                            <span>{formatDateShort(sc.completedAt)}</span>
                          </div>
                        )}

                        {/* Admin review button — opens confirmation dialog */}
                        {isAdmin && isAwaitingReview && onReviewSC && (
                          <div className="pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 w-full"
                              onClick={() => setScReviewAssessment(sc)}
                              disabled={isAnyOperationInProgress}
                            >
                              <ClipboardList className="h-3 w-3 mr-1" />
                              {strings.competencies.reviewAssessment}
                            </Button>
                          </div>
                        )}

                        {/* Reviewer info */}
                        {sc.reviewer && sc.reviewedAt && (
                          <div className="text-xs text-muted-foreground pt-1 border-t space-y-0.5">
                            <p>Reviewed by {sc.reviewer.displayName}</p>
                            <p>{formatDateShort(sc.reviewedAt)}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Footer: Send Assessment button or status messages */}
              {scAssessments.length === 0 && (
                <div className="text-center py-2">
                  {isActionable ? (
                    <>
                      {gcNotCompleted ? (
                        <p className="text-xs text-muted-foreground opacity-60">
                          {strings.interview.gcNotCompleted}
                        </p>
                      ) : gcFailed ? (
                        <p className="text-xs text-muted-foreground opacity-60">
                          {strings.interview.gcFailed}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Ready to receive specialised assessment
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {strings.statuses.applicationRejected}
                    </p>
                  )}
                </div>
              )}

              {/* Send Assessment button (shown when GC passed and application is active) */}
              {isActionable && gcPassed && onSendSCInvitation && (
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 w-full"
                    onClick={() => setIsSCExplorerOpen(true)}
                    disabled={isAnyOperationInProgress}
                  >
                    {isSendingSCInvitation ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-3 w-3 mr-1" />
                        Send Assessment
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* SC Explorer Dialog */}
              {onSendSCInvitation && (
                <SCExplorerDialog
                  isOpen={isSCExplorerOpen}
                  onClose={() => setIsSCExplorerOpen(false)}
                  onConfirm={async (competencyIds) => {
                    await onSendSCInvitation(competencyIds);
                    setIsSCExplorerOpen(false);
                  }}
                  isProcessing={isSendingSCInvitation}
                  alreadyAssignedIds={alreadyAssignedScIds}
                />
              )}

              {/* SC Review Dialog */}
              {onReviewSC && (
                <SCReviewDialog
                  isOpen={scReviewAssessment !== null}
                  onClose={() => setScReviewAssessment(null)}
                  onConfirm={async (assessmentId, passed) => {
                    await onReviewSC(assessmentId, passed);
                    setScReviewAssessment(null);
                  }}
                  isProcessing={isReviewingSC}
                  assessment={scReviewAssessment}
                />
              )}
            </>
          );
        })()}
      </div>

      {/* Interview */}
      <div className="border rounded-lg p-4">
        {(() => {
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
                    <Clock className="h-3 w-3 mr-1" /> Pending
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
                      ) : gcNotCompleted ? (
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
                    <p className="text-xs text-muted-foreground">
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
                  <p className="text-xs text-muted-foreground mb-2">No decision has been made yet</p>
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

      {/* Agreement */}
      {(application.agreementSignedAt || application.currentStage === 'AGREEMENT' || application.currentStage === 'SIGNED') && (
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-sm">Agreement</h4>
            {isOfferWithdrawn ? (
              <Badge variant="destructive" className="text-xs">
                <ShieldAlert className="h-3 w-3 mr-1" /> Withdrawn
              </Badge>
            ) : application.agreementSignedAt ? (
              <Badge variant="default" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" /> Signed
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" /> Pending
              </Badge>
            )}
          </div>

          {isOfferWithdrawn ? (
            <div className="space-y-2">
              {withdrawalDecision.user && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Withdrawn By</span>
                  <span className="text-right">{withdrawalDecision.user.displayName}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Date</span>
                <span className="text-right">{formatDateTime(withdrawalDecision.decidedAt)}</span>
              </div>
              <div className="mt-2 pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Reason</p>
                <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded p-2">
                  {withdrawalDecision.reason}
                </p>
              </div>
            </div>
          ) : application.agreementSignedAt && application.agreementData ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Legal Name</span>
                <span className="text-right">
                  {application.agreementData.legalFirstName}
                  {application.agreementData.legalMiddleName ? ` ${application.agreementData.legalMiddleName}` : ''}
                  {` ${application.agreementData.legalLastName}`}
                </span>
              </div>
              {(application.agreementData.preferredFirstName || application.agreementData.preferredLastName) && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Preferred Name</span>
                  <span className="text-right">
                    {[application.agreementData.preferredFirstName, application.agreementData.preferredLastName].filter(Boolean).join(' ')}
                  </span>
                </div>
              )}
              {application.agreementData.dateOfBirth && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date of Birth</span>
                  <span className="text-right">{application.agreementData.dateOfBirth}</span>
                </div>
              )}
              {application.agreementData.country && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Country</span>
                  <span className="text-right">{application.agreementData.country}</span>
                </div>
              )}
              {application.agreementData.entityRepresented && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Entity</span>
                  <span className="text-right">{application.agreementData.entityRepresented}</span>
                </div>
              )}
              {application.agreementData.serviceHours && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service Hours</span>
                  <span className="text-right">{application.agreementData.serviceHours}</span>
                </div>
              )}
              {application.agreementData.biography && (
                <div className="mt-2 pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Biography</p>
                  <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded p-2">
                    {application.agreementData.biography}
                  </p>
                </div>
              )}
              {application.agreementData.profilePictureUrl && (
                <div className="mt-2 pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Profile Picture</p>
                  <a href={application.agreementData.profilePictureUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" /> View Picture
                  </a>
                </div>
              )}
              {application.agreementData.signatureUrl && (
                <div className="mt-2 pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Signature</p>
                  <a href={application.agreementData.signatureUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" /> View Signature
                  </a>
                </div>
              )}
              <div className="flex justify-between text-sm mt-2 pt-2 border-t">
                <span className="text-muted-foreground">Signed</span>
                <span className="text-right">{formatDateTime(application.agreementSignedAt)}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-2 space-y-2">
              <p className="text-xs text-muted-foreground">
                Awaiting agreement signature from candidate
              </p>
              {onWithdrawOffer && isAdmin && application.status === 'ACCEPTED' && application.currentStage === 'AGREEMENT' && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="text-xs py-2"
                  onClick={onWithdrawOffer}
                  disabled={isAnyOperationInProgress}
                >
                  {isWithdrawingOffer ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <ShieldAlert className="h-3 w-3 mr-1" />
                  )}
                  {strings.withdrawOffer.menuItem}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Profile tab content — personal info, documents, academic background, previous experience
 */
function ProfileTab({ application }: { application: ApplicationDetailData }) {
  return <ProfileContent application={application} />;
}

/**
 * Activity tab content — audit log timeline
 */
function ActivityTab({ auditLogs }: { auditLogs?: ApplicationDetailProps['auditLogs'] }) {
  const timelineItems = buildTimelineItems(auditLogs);

  return (
    <div>
      <SectionTitle>Activity</SectionTitle>
      {timelineItems.length > 0 ? (
        <Timeline items={timelineItems} />
      ) : (
        <p className="text-sm text-muted-foreground">No activity recorded yet</p>
      )}
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
  onWithdrawOffer,
  isWithdrawingOffer,
  onSendSCInvitation,
  isSendingSCInvitation,
  onReviewSC,
  isReviewingSC,
}: ApplicationDetailProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // Always render the dialog when open - show skeleton while loading
  const showSkeleton = isLoading || !application;

  // Get display data (use application data or placeholder for header)
  const displayName = application
    ? [application.person.firstName, application.person.middleName, application.person.lastName].filter(Boolean).join(' ')
    : 'Loading...';

  const headerDescription = showSkeleton ? (
    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-muted-foreground text-sm">
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-4 w-32" />
    </div>
  ) : (
    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-sm">
      <StageBadge stage={application.currentStage} />
      <StatusBadge status={application.status} />
      <span className="text-muted-foreground">•</span>
      <span>{application.position}</span>
      <span className="text-muted-foreground hidden sm:inline">•</span>
      <span className="hidden sm:inline">Applied {formatDateShort(application.createdAt)}</span>
    </div>
  );

  // Desktop: Dialog with 70/30 split
  if (isDesktop) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-[95vw] sm:max-w-6xl h-[90vh] flex flex-col gap-0 p-0 rounded-2xl shadow-2xl">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <DialogTitle className="text-2xl font-bold">
                  {showSkeleton ? 'Loading...' : displayName}
                </DialogTitle>
                {showSkeleton ? (
                  headerDescription
                ) : (
                  <DialogDescription asChild>
                    {headerDescription}
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
              <div className="flex flex-col lg:flex-row h-full min-w-0">
                {/* Left Panel - 70% */}
                <ScrollArea className="flex-1 lg:w-[70%] min-w-0">
                  <div className="p-6">
                    <LeftPanel application={application} auditLogs={auditLogs} />
                  </div>
                </ScrollArea>

                {/* Right Panel - 30% */}
                <div className="lg:w-[30%] lg:min-w-[280px] border-t lg:border-t-0 lg:border-l bg-muted/30">
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
                        onWithdrawOffer={onWithdrawOffer}
                        isWithdrawingOffer={isWithdrawingOffer}
                        onSendSCInvitation={onSendSCInvitation}
                        isSendingSCInvitation={isSendingSCInvitation}
                        onReviewSC={onReviewSC}
                        isReviewingSC={isReviewingSC}
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

  // Mobile: Bottom sheet with tabs
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[92vh] rounded-t-2xl flex flex-col gap-0 p-0">
        {/* Header */}
        <SheetHeader className="px-4 pt-4 pb-2 border-b shrink-0">
          <SheetTitle className="text-lg font-bold text-left leading-tight">
            {showSkeleton ? 'Loading...' : displayName}
          </SheetTitle>
          <SheetDescription asChild>
            {headerDescription}
          </SheetDescription>
        </SheetHeader>

        {/* Tabbed Content */}
        {showSkeleton ? (
          <div className="p-4 flex-1 overflow-auto">
            <DetailSkeleton />
          </div>
        ) : (
          <Tabs defaultValue="profile" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-4 mt-3 w-auto">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="assessment">Assessment</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="flex-1 overflow-auto mt-0">
              <div className="p-4">
                <ProfileTab application={application} />
              </div>
            </TabsContent>

            <TabsContent value="assessment" className="flex-1 overflow-auto mt-0">
              <div className="p-4">
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
                  onWithdrawOffer={onWithdrawOffer}
                  isWithdrawingOffer={isWithdrawingOffer}
                  onSendSCInvitation={onSendSCInvitation}
                  isSendingSCInvitation={isSendingSCInvitation}
                  onReviewSC={onReviewSC}
                  isReviewingSC={isReviewingSC}
                />
              </div>
            </TabsContent>

            <TabsContent value="activity" className="flex-1 overflow-auto mt-0">
              <div className="p-4">
                <ActivityTab auditLogs={auditLogs} />
              </div>
            </TabsContent>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}
