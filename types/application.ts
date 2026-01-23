/**
 * Application Types
 *
 * Type definitions for job Applications in the talent pipeline.
 * An Application represents a person applying for a specific position.
 * A Person can have multiple Applications (one per position).
 */

import type {
  Stage,
  Status,
  AssessmentType,
  InterviewOutcome,
  DecisionType,
  Prisma,
} from '@/lib/generated/prisma/client';

type Decimal = Prisma.Decimal;

/**
 * Application data as returned from the database
 */
export interface Application {
  id: string;
  personId: string;
  position: string;
  currentStage: Stage;
  status: Status;
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
  tallySubmissionId: string;
  tallyResponseId: string | null;
  tallyFormId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Application with person info for list views
 */
export interface ApplicationListItem {
  id: string;
  personId: string;
  position: string;
  currentStage: Stage;
  status: Status;
  createdAt: Date;
  updatedAt: Date;
  person: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    generalCompetenciesCompleted: boolean;
    generalCompetenciesScore: Decimal | null;
  };
  _count: {
    interviews: number;
    decisions: number;
  };
}

/**
 * Application for pipeline/kanban board display
 */
export interface ApplicationCard {
  id: string;
  personId: string;
  position: string;
  currentStage: Stage;
  status: Status;
  createdAt: Date;
  person: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    generalCompetenciesCompleted: boolean;
    generalCompetenciesScore: Decimal | null;
  };
  /** Number of applications this person has */
  personApplicationCount: number;
  /** Fields that were claimed but are missing */
  missingFields: string[];
}

/**
 * Full application detail with all related data
 */
export interface ApplicationDetail extends Application {
  person: PersonDetailForApplication;
  assessments: AssessmentDetail[];
  interviews: InterviewDetail[];
  decisions: DecisionDetail[];
}

/**
 * Person info included in application detail
 */
export interface PersonDetailForApplication {
  id: string;
  email: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  secondaryEmail: string | null;
  phoneNumber: string | null;
  country: string | null;
  city: string | null;
  state: string | null;
  countryCode: string | null;
  portfolioLink: string | null;
  educationLevel: string | null;
  generalCompetenciesCompleted: boolean;
  generalCompetenciesScore: Decimal | null;
  generalCompetenciesPassedAt: Date | null;
}

/**
 * Assessment detail for application view
 */
export interface AssessmentDetail {
  id: string;
  assessmentType: AssessmentType;
  score: Decimal;
  passed: boolean;
  threshold: Decimal;
  completedAt: Date;
  rawData: unknown;
}

/**
 * Interview detail for application view
 */
export interface InterviewDetail {
  id: string;
  interviewerId: string;
  schedulingLink: string;
  scheduledAt: Date | null;
  completedAt: Date | null;
  notes: string | null;
  outcome: InterviewOutcome;
  emailSentAt: Date | null;
  createdAt: Date;
  interviewer: {
    id: string;
    displayName: string;
    email: string;
  };
}

/**
 * Decision detail for application view
 */
export interface DecisionDetail {
  id: string;
  decision: DecisionType;
  reason: string;
  notes: string | null;
  decidedAt: Date;
  user: {
    id: string;
    displayName: string;
    email: string;
  };
}

/**
 * Data for creating a new application from Tally webhook
 */
export interface CreateApplicationData {
  personId: string;
  position: string;
  resumeUrl?: string;
  academicBackground?: string;
  previousExperience?: string;
  videoLink?: string;
  otherFileUrl?: string;
  hasResume?: boolean;
  hasAcademicBg?: boolean;
  hasVideoIntro?: boolean;
  hasPreviousExp?: boolean;
  hasOtherFile?: boolean;
  tallySubmissionId: string;
  tallyResponseId?: string;
  tallyFormId?: string;
}

/**
 * Data for updating an application (admin only)
 */
export interface UpdateApplicationData {
  currentStage?: Stage;
  status?: Status;
  resumeUrl?: string | null;
  academicBackground?: string | null;
  previousExperience?: string | null;
  videoLink?: string | null;
  otherFileUrl?: string | null;
}

/**
 * Data for advancing application to next stage
 */
export interface AdvanceStageData {
  applicationId: string;
  newStage: Stage;
  reason?: string;
}

/**
 * Data for recording a hiring decision
 */
export interface RecordDecisionData {
  applicationId: string;
  decision: DecisionType;
  reason: string;
  notes?: string;
  decidedBy: string;
}

/**
 * Data for scheduling an interview
 */
export interface ScheduleInterviewData {
  applicationId: string;
  interviewerId: string;
  schedulingLink: string;
  scheduledAt?: Date;
  notes?: string;
}

/**
 * Application statistics for dashboard
 */
export interface ApplicationStats {
  total: number;
  active: number;
  byStage: Record<Stage, number>;
  byStatus: Record<Status, number>;
  byPosition: Record<string, number>;
  awaitingAction: number;
  recentActivity: number;
}

/**
 * Filter options for listing applications
 */
export interface ApplicationFilters {
  personId?: string;
  position?: string;
  stage?: Stage;
  status?: Status;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'position';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response for applications list
 */
export interface ApplicationsListResponse {
  applications: ApplicationListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Missing fields detection result
 */
export interface MissingFieldsCheck {
  hasMissing: boolean;
  fields: string[];
}

/**
 * Calculate missing fields for an application
 */
export function getMissingFields(app: Application): MissingFieldsCheck {
  const fields: string[] = [];

  if (app.hasResume && !app.resumeUrl) {
    fields.push('Resume');
  }
  if (app.hasAcademicBg && !app.academicBackground) {
    fields.push('Academic Background');
  }
  if (app.hasVideoIntro && !app.videoLink) {
    fields.push('Video Introduction');
  }
  if (app.hasPreviousExp && !app.previousExperience) {
    fields.push('Previous Experience');
  }
  if (app.hasOtherFile && !app.otherFileUrl) {
    fields.push('Other File');
  }

  return {
    hasMissing: fields.length > 0,
    fields,
  };
}

/**
 * Pipeline stage configuration
 */
export interface PipelineStage {
  id: Stage;
  name: string;
  order: number;
  automated: boolean;
}

/**
 * Applications grouped by stage for pipeline view
 */
export interface PipelineData {
  stages: PipelineStage[];
  applicationsByStage: Record<Stage, ApplicationCard[]>;
  stats: ApplicationStats;
}
