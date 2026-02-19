/**
 * Application Service
 *
 * Provides CRUD operations for managing job applications.
 * An Application represents a person applying for a specific position.
 * A person can have multiple applications (one per position).
 */

import { db } from '@/lib/db';
import { Prisma, Stage, Status } from '@/lib/generated/prisma/client';
import { recruitment } from '@/config/recruitment';
import { validateSortField, validateSortOrder } from '@/lib/security';
import { calcMissingFields } from '@/lib/utils';
import type {
  Application,
  ApplicationListItem,
  ApplicationCard,
  ApplicationDetail,
  CreateApplicationData,
  UpdateApplicationData,
  ApplicationStats,
  ApplicationFilters,
  ApplicationsListResponse,
} from '@/types/application';

/**
 * Get all applications with optional filtering and pagination
 *
 * @param filters - Filter options
 * @returns Paginated list of applications with person info
 */
export async function getApplications(filters?: ApplicationFilters): Promise<ApplicationsListResponse> {
  const {
    personId,
    position,
    stage,
    status,
    search,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = filters || {};

  const where: Prisma.ApplicationWhereInput = {};

  if (personId) {
    where.personId = personId;
  }

  if (position) {
    where.position = position;
  }

  if (stage) {
    where.currentStage = stage;
  }

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { position: { contains: search } },
      { person: { email: { contains: search } } },
      { person: { firstName: { contains: search } } },
      { person: { lastName: { contains: search } } },
    ];
  }

  const validatedSortBy = validateSortField(sortBy);
  const validatedSortOrder = validateSortOrder(sortOrder);
  const orderBy: Prisma.ApplicationOrderByWithRelationInput = {
    [validatedSortBy]: validatedSortOrder,
  };

  const [applications, total] = await Promise.all([
    db.application.findMany({
      where,
      select: {
        id: true,
        personId: true,
        position: true,
        currentStage: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        person: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            generalCompetenciesCompleted: true,
            generalCompetenciesScore: true,
          },
        },
        _count: {
          select: {
            interviews: true,
            decisions: true,
          },
        },
      },
      orderBy,
      take: limit,
      skip: (page - 1) * limit,
    }),
    db.application.count({ where }),
  ]);

  return {
    applications,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get applications grouped by stage for pipeline view
 *
 * @param filters - Optional filters (status, position)
 * @returns Applications organized by stage with counts
 */
export async function getApplicationsForPipeline(filters?: {
  status?: Status;
  position?: string;
}): Promise<{ applicationsByStage: Record<Stage, ApplicationCard[]>; stats: ApplicationStats }> {
  const where: Prisma.ApplicationWhereInput = {};

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.position) {
    where.position = filters.position;
  }

  const applications = await db.application.findMany({
    where,
    select: {
      id: true,
      personId: true,
      position: true,
      currentStage: true,
      status: true,
      createdAt: true,
      hasResume: true,
      hasAcademicBg: true,
      hasVideoIntro: true,
      hasPreviousExp: true,
      hasOtherFile: true,
      resumeUrl: true,
      academicBackground: true,
      videoLink: true,
      previousExperience: true,
      otherFileUrl: true,
      person: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          generalCompetenciesCompleted: true,
          generalCompetenciesScore: true,
          _count: {
            select: { applications: true },
          },
        },
      },
      _count: {
        select: {
          assessments: true,
          interviews: true,
        },
      },
      interviews: {
        where: { completedAt: { not: null } },
        select: { id: true },
        take: 1,
      },
      assessments: {
        where: { assessmentType: 'SPECIALIZED_COMPETENCIES' },
        select: { id: true },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Group applications by stage
  const applicationsByStage: Record<Stage, ApplicationCard[]> = {
    APPLICATION: [],
    GENERAL_COMPETENCIES: [],
    SPECIALIZED_COMPETENCIES: [],
    INTERVIEW: [],
    AGREEMENT: [],
    SIGNED: [],
  };

  for (const app of applications) {
    // Determine if this application needs attention
    const needsAttention = app.status === 'ACTIVE' && (
      (app.currentStage === 'APPLICATION' && !app.person.generalCompetenciesCompleted) ||
      (app.currentStage === 'SPECIALIZED_COMPETENCIES' && app.assessments.length === 0) ||
      (app.currentStage === 'INTERVIEW' && app.interviews.length === 0) ||
      (app.currentStage === 'AGREEMENT')
    );

    const card: ApplicationCard = {
      id: app.id,
      personId: app.personId,
      position: app.position,
      currentStage: app.currentStage,
      status: app.status,
      createdAt: app.createdAt,
      person: {
        id: app.person.id,
        firstName: app.person.firstName,
        lastName: app.person.lastName,
        email: app.person.email,
        generalCompetenciesCompleted: app.person.generalCompetenciesCompleted,
        generalCompetenciesScore: app.person.generalCompetenciesScore,
      },
      personApplicationCount: app.person._count.applications,
      missingFields: calcMissingFields(app),
      needsAttention,
    };

    applicationsByStage[app.currentStage].push(card);
  }

  // Get stats
  const stats = await getApplicationStats(filters);

  return { applicationsByStage, stats };
}

/**
 * Get a single application by ID
 *
 * @param id - Application ID (UUID)
 * @returns Application or null if not found
 */
export async function getApplicationById(id: string): Promise<Application | null> {
  const application = await db.application.findUnique({
    where: { id },
  });

  return application;
}

/**
 * Get full application details with all related data
 *
 * @param id - Application ID
 * @returns Application with person, assessments, interviews, decisions
 */
export async function getApplicationDetail(id: string): Promise<ApplicationDetail | null> {
  const application = await db.application.findUnique({
    where: { id },
    include: {
      person: {
        select: {
          id: true,
          email: true,
          firstName: true,
          middleName: true,
          lastName: true,
          secondaryEmail: true,
          phoneNumber: true,
          country: true,
          city: true,
          state: true,
          countryCode: true,
          portfolioLink: true,
          educationLevel: true,
          generalCompetenciesCompleted: true,
          generalCompetenciesScore: true,
          generalCompetenciesPassedAt: true,
        },
      },
      assessments: {
        select: {
          id: true,
          assessmentType: true,
          score: true,
          passed: true,
          threshold: true,
          completedAt: true,
          rawData: true,
        },
        orderBy: { completedAt: 'desc' },
      },
      interviews: {
        select: {
          id: true,
          interviewerId: true,
          schedulingLink: true,
          scheduledAt: true,
          completedAt: true,
          notes: true,
          outcome: true,
          emailSentAt: true,
          createdAt: true,
          interviewer: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      decisions: {
        select: {
          id: true,
          decision: true,
          reason: true,
          notes: true,
          decidedAt: true,
          user: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
        orderBy: { decidedAt: 'desc' },
      },
    },
  });

  return application as ApplicationDetail | null;
}

/**
 * Get application by Tally submission ID
 *
 * Used for idempotency checks on webhooks.
 *
 * @param tallySubmissionId - Tally submission ID
 * @returns Application or null
 */
export async function getApplicationByTallySubmissionId(
  tallySubmissionId: string
): Promise<Application | null> {
  const application = await db.application.findUnique({
    where: { tallySubmissionId },
  });

  return application;
}

/**
 * Create a new application
 *
 * @param data - Application creation data
 * @returns Created application
 */
export async function createApplication(data: CreateApplicationData): Promise<Application> {
  const application = await db.application.create({
    data: {
      personId: data.personId,
      position: data.position,
      resumeUrl: data.resumeUrl,
      academicBackground: data.academicBackground,
      previousExperience: data.previousExperience,
      videoLink: data.videoLink,
      otherFileUrl: data.otherFileUrl,
      hasResume: data.hasResume ?? false,
      hasAcademicBg: data.hasAcademicBg ?? false,
      hasVideoIntro: data.hasVideoIntro ?? false,
      hasPreviousExp: data.hasPreviousExp ?? false,
      hasOtherFile: data.hasOtherFile ?? false,
      tallySubmissionId: data.tallySubmissionId,
      tallyResponseId: data.tallyResponseId,
      tallyFormId: data.tallyFormId,
    },
  });

  return application;
}

/**
 * Update an application (admin only)
 *
 * @param id - Application ID
 * @param data - Update data
 * @returns Updated application
 */
export async function updateApplication(id: string, data: UpdateApplicationData): Promise<Application> {
  const application = await db.application.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });

  return application;
}

/**
 * Advance application to next stage
 *
 * @param id - Application ID
 * @param newStage - Target stage
 * @returns Updated application
 */
export async function advanceApplicationStage(id: string, newStage: Stage): Promise<Application> {
  const application = await db.application.update({
    where: { id },
    data: {
      currentStage: newStage,
      updatedAt: new Date(),
    },
  });

  return application;
}

/**
 * Update application status (e.g., reject, withdraw)
 *
 * @param id - Application ID
 * @param status - New status
 * @returns Updated application
 */
export async function updateApplicationStatus(id: string, status: Status): Promise<Application> {
  const application = await db.application.update({
    where: { id },
    data: {
      status,
      updatedAt: new Date(),
    },
  });

  return application;
}

/**
 * Delete an application
 *
 * Note: This cascades to assessments, interviews, decisions.
 * Typically, applications should be marked as WITHDRAWN instead.
 *
 * @param id - Application ID
 */
export async function deleteApplication(id: string): Promise<void> {
  await db.application.delete({
    where: { id },
  });
}

/**
 * Get application statistics
 *
 * @param filters - Optional filters
 * @returns Application statistics
 */
export async function getApplicationStats(filters?: {
  status?: Status;
  position?: string;
}): Promise<ApplicationStats> {
  const baseWhere: Prisma.ApplicationWhereInput = {};

  if (filters?.position) {
    baseWhere.position = filters.position;
  }

  // Get total and active counts
  const [total, active] = await Promise.all([
    db.application.count({ where: baseWhere }),
    db.application.count({ where: { ...baseWhere, status: 'ACTIVE' } }),
  ]);

  // Get counts by stage
  const byStage: Record<Stage, number> = {
    APPLICATION: 0,
    GENERAL_COMPETENCIES: 0,
    SPECIALIZED_COMPETENCIES: 0,
    INTERVIEW: 0,
    AGREEMENT: 0,
    SIGNED: 0,
  };

  const stageCounts = await db.application.groupBy({
    by: ['currentStage'],
    where: filters?.status ? { ...baseWhere, status: filters.status } : baseWhere,
    _count: true,
  });

  for (const item of stageCounts) {
    byStage[item.currentStage] = item._count;
  }

  // Get counts by status
  const byStatus: Record<Status, number> = {
    ACTIVE: 0,
    ACCEPTED: 0,
    REJECTED: 0,
    WITHDRAWN: 0,
  };

  const statusCounts = await db.application.groupBy({
    by: ['status'],
    where: baseWhere,
    _count: true,
  });

  for (const item of statusCounts) {
    byStatus[item.status] = item._count;
  }

  // Get counts by position
  const positionCounts = await db.application.groupBy({
    by: ['position'],
    where: baseWhere,
    _count: true,
  });

  const byPosition: Record<string, number> = {};
  for (const item of positionCounts) {
    byPosition[item.position] = item._count;
  }

  // Count applications awaiting action — matches dashboard logic:
  // - APPLICATION stage where GC not completed
  // - SPECIALIZED_COMPETENCIES stage where SC assessment not submitted
  // - INTERVIEW stage where no interview has been completed
  // - AGREEMENT stage (pending offer/agreement)
  const awaitingAction = await db.application.count({
    where: {
      status: 'ACTIVE',
      OR: [
        {
          currentStage: 'APPLICATION',
          person: { generalCompetenciesCompleted: false },
        },
        {
          currentStage: 'SPECIALIZED_COMPETENCIES',
          assessments: { none: { assessmentType: 'SPECIALIZED_COMPETENCIES' } },
        },
        {
          currentStage: 'INTERVIEW',
          interviews: { none: { completedAt: { not: null } } },
        },
        {
          currentStage: 'AGREEMENT',
        },
      ],
    },
  });

  // Recent activity (applications updated in last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentActivity = await db.application.count({
    where: {
      updatedAt: { gte: sevenDaysAgo },
    },
  });

  return {
    total,
    active,
    byStage,
    byStatus,
    byPosition,
    awaitingAction,
    recentActivity,
  };
}

/**
 * Get all applications for a person
 *
 * @param personId - Person ID
 * @returns Array of applications
 */
export async function getApplicationsByPersonId(personId: string): Promise<ApplicationListItem[]> {
  const applications = await db.application.findMany({
    where: { personId },
    select: {
      id: true,
      personId: true,
      position: true,
      currentStage: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      person: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          generalCompetenciesCompleted: true,
          generalCompetenciesScore: true,
        },
      },
      _count: {
        select: {
          interviews: true,
          decisions: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return applications;
}

/**
 * Get all active applications in APPLICATION or GENERAL_COMPETENCIES stage
 * for a person.
 *
 * Used when GC assessment is completed to advance all relevant applications.
 *
 * @param personId - Person ID
 * @returns Array of applications
 */
export async function getApplicationsAwaitingGCResult(personId: string): Promise<Application[]> {
  const applications = await db.application.findMany({
    where: {
      personId,
      status: 'ACTIVE',
      currentStage: { in: ['APPLICATION', 'GENERAL_COMPETENCIES'] },
    },
  });

  return applications;
}

/**
 * Advance multiple applications to next stage
 *
 * Used when GC assessment is completed and all pending applications need to advance.
 *
 * @param applicationIds - Array of application IDs
 * @param newStage - Target stage
 */
export async function advanceMultipleApplications(
  applicationIds: string[],
  newStage: Stage
): Promise<void> {
  await db.application.updateMany({
    where: { id: { in: applicationIds } },
    data: {
      currentStage: newStage,
      updatedAt: new Date(),
    },
  });
}

/**
 * Reject multiple applications
 *
 * Used when GC assessment fails and all pending applications need to be rejected.
 *
 * @param applicationIds - Array of application IDs
 */
export async function rejectMultipleApplications(applicationIds: string[]): Promise<void> {
  await db.application.updateMany({
    where: { id: { in: applicationIds } },
    data: {
      status: 'REJECTED',
      updatedAt: new Date(),
    },
  });
}

/**
 * Get available positions from config
 *
 * @returns Array of position names
 */
export function getAvailablePositions(): readonly string[] {
  return recruitment.positions;
}

/**
 * Check if an application can be advanced to a specific stage
 *
 * @param application - The application to check
 * @param targetStage - The target stage
 * @returns Boolean indicating if advancement is allowed
 */
export function canAdvanceToStage(application: Application, targetStage: Stage): boolean {
  const stages = recruitment.stages;
  const currentOrder = stages.find((s) => s.id === application.currentStage)?.order ?? 0;
  const targetOrder = stages.find((s) => s.id === targetStage)?.order ?? 0;

  // Can only advance forward
  return targetOrder > currentOrder && application.status === 'ACTIVE';
}

/**
 * Get the next stage for an application
 *
 * @param currentStage - Current stage
 * @returns Next stage or null if at final stage
 */
export function getNextStage(currentStage: Stage): Stage | null {
  const stages = recruitment.stages;
  const currentOrder = stages.find((s) => s.id === currentStage)?.order ?? 0;
  const nextStage = stages.find((s) => s.order === currentOrder + 1);
  return (nextStage?.id as Stage) ?? null;
}
