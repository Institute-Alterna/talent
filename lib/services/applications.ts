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
  AgreementData,
  CreateApplicationData,
  UpdateApplicationData,
  ApplicationStats,
  AttentionBreakdown,
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

  if (filters?.status === 'ACTIVE') {
    // "Active" pipeline view: show ACTIVE applications plus ACCEPTED ones
    // still in the pipeline (AGREEMENT stage, or SIGNED within 15 days)
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    where.OR = [
      { status: 'ACTIVE' },
      {
        status: 'ACCEPTED',
        currentStage: 'AGREEMENT',
      },
      {
        status: 'ACCEPTED',
        currentStage: 'SIGNED',
        agreementSignedAt: { gte: fifteenDaysAgo },
      },
    ];
  } else if (filters?.status) {
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
      agreementSignedAt: true,
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
    // AGREEMENT stage never needs attention — the offer letter (with agreement link)
    // is always sent on acceptance, so the ball is in the candidate's court.
    const needsAttention = app.status === 'ACTIVE' && (
      ((app.currentStage === 'APPLICATION' || app.currentStage === 'GENERAL_COMPETENCIES') && !app.person.generalCompetenciesCompleted) ||
      (app.currentStage === 'SPECIALIZED_COMPETENCIES' && app.assessments.length === 0) ||
      (app.currentStage === 'INTERVIEW' && app.interviews.length === 0)
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
    select: {
      id: true,
      personId: true,
      position: true,
      currentStage: true,
      status: true,
      resumeUrl: true,
      academicBackground: true,
      previousExperience: true,
      videoLink: true,
      otherFileUrl: true,
      hasResume: true,
      hasAcademicBg: true,
      hasVideoIntro: true,
      hasPreviousExp: true,
      hasOtherFile: true,
      agreementSignedAt: true,
      agreementTallySubmissionId: true,
      agreementData: true,
      tallySubmissionId: true,
      tallyResponseId: true,
      tallyFormId: true,
      createdAt: true,
      updatedAt: true,
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
          assessments: {
            where: { assessmentType: 'GENERAL_COMPETENCIES' },
            select: { id: true, score: true, passed: true, threshold: true, completedAt: true, rawData: true },
            orderBy: { completedAt: 'desc' },
            take: 1,
          },
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
 * Update application status (e.g., accept, reject)
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
 * Get application by agreement Tally submission ID
 *
 * Used for idempotency checks on agreement webhooks.
 *
 * @param agreementTallySubmissionId - Agreement Tally submission ID
 * @returns Application or null
 */
export async function getApplicationByAgreementTallySubmissionId(
  agreementTallySubmissionId: string
): Promise<Application | null> {
  const application = await db.application.findUnique({
    where: { agreementTallySubmissionId },
  });

  return application;
}

/**
 * Update application with agreement signing data
 *
 * @param id - Application ID
 * @param data - Agreement data
 * @returns Updated application
 */
export async function updateApplicationAgreement(
  id: string,
  data: {
    agreementSignedAt: Date;
    agreementTallySubmissionId: string;
    agreementData: AgreementData;
  }
): Promise<Application> {
  const application = await db.application.update({
    where: { id },
    data: {
      agreementSignedAt: data.agreementSignedAt,
      agreementTallySubmissionId: data.agreementTallySubmissionId,
      agreementData: data.agreementData as unknown as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });

  return application;
}

/**
 * Delete an application
 *
 * Note: This cascades to assessments, interviews, decisions.
 *
 * @param id - Application ID
 */
export async function deleteApplication(id: string): Promise<void> {
  await db.application.delete({
    where: { id },
  });
}

/**
 * Count active applications for a person at a given stage,
 * excluding a specific application.
 *
 * Used for email deduplication: e.g. only send GCQ invite
 * if no other active application is already at GENERAL_COMPETENCIES.
 *
 * @param personId - Person ID
 * @param stage - Pipeline stage to check
 * @param excludeApplicationId - Application ID to exclude from count
 * @returns Count of matching applications
 */
export async function countOtherActiveApplicationsAtStage(
  personId: string,
  stage: Stage,
  excludeApplicationId: string
): Promise<number> {
  return db.application.count({
    where: {
      personId,
      status: 'ACTIVE',
      currentStage: stage,
      id: { not: excludeApplicationId },
    },
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

  // Attention breakdown and recent activity in parallel
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [breakdown, recentActivity] = await Promise.all([
    getAttentionBreakdown({ position: filters?.position }),
    db.application.count({ where: { updatedAt: { gte: sevenDaysAgo } } }),
  ]);

  return {
    total,
    active,
    byStage,
    byStatus,
    byPosition,
    awaitingAction: breakdown.total,
    breakdown,
    recentActivity,
  };
}

/**
 * Get the attention breakdown for active applications.
 *
 * Canonical logic — must match `needsAttention` in `getApplicationsForPipeline`:
 * - APPLICATION stage where person has not completed GC
 * - SPECIALIZED_COMPETENCIES stage where no SC assessment has been submitted
 * - INTERVIEW stage where no interview has been completed
 * - AGREEMENT stage never needs attention (offer letter always sent on acceptance)
 *
 * @param filters - Optional position filter (status is always ACTIVE)
 * @returns Per-category counts and overall total
 */
export async function getAttentionBreakdown(filters?: {
  position?: string;
}): Promise<AttentionBreakdown> {
  const base: Prisma.ApplicationWhereInput = {
    status: 'ACTIVE',
    ...(filters?.position ? { position: filters.position } : {}),
  };

  const [awaitingGC, awaitingSC, pendingInterviews, pendingAgreement] = await Promise.all([
    db.application.count({
      where: { ...base, currentStage: { in: ['APPLICATION', 'GENERAL_COMPETENCIES'] }, person: { generalCompetenciesCompleted: false } },
    }),
    db.application.count({
      where: { ...base, currentStage: 'SPECIALIZED_COMPETENCIES', assessments: { none: { assessmentType: 'SPECIALIZED_COMPETENCIES' } } },
    }),
    // No completed interview yet — matches needsAttention card logic
    // (app.interviews only selects completedAt rows, so length === 0 means no completion)
    db.application.count({
      where: { ...base, currentStage: 'INTERVIEW', interviews: { none: { completedAt: { not: null } } } },
    }),
    // AGREEMENT stage: offer letter is always sent on acceptance, so the
    // candidate is responsible for signing — never needs attention.
    // Return 0 to satisfy the AttentionBreakdown interface.
    Promise.resolve(0),
  ]);

  return {
    awaitingGC,
    awaitingSC,
    pendingInterviews,
    pendingAgreement,
    total: awaitingGC + awaitingSC + pendingInterviews + pendingAgreement,
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
 * APPLICATION is included defensively: an application may remain in this
 * stage if the GC invitation email was skipped or failed, so the person
 * completed the assessment before the app was auto-advanced to
 * GENERAL_COMPETENCIES. Including it ensures no application is left behind.
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
