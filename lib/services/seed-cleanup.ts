/**
 * Seed Data Cleanup Service
 *
 * Provides functions to remove seed/sample data from the database
 * to prepare the application for production use.
 *
 * Seed data is identified by specific patterns:
 * - Users: oktaUserId starts with 'okta-'
 * - Persons: tallyRespondentId starts with 'tally-resp-'
 * - Related records (applications, assessments, etc.) are cascade deleted
 */

import { db } from '@/lib/db';

/**
 * Result of seed data cleanup operation
 */
export interface SeedCleanupResult {
  usersRemoved: number;
  personsRemoved: number;
  applicationsRemoved: number;
  assessmentsRemoved: number;
  interviewsRemoved: number;
  decisionsRemoved: number;
  auditLogsRemoved: number;
  emailLogsRemoved: number;
}

/**
 * Check if there is any seed data in the database
 *
 * @returns true if seed data exists
 */
export async function hasSeedData(): Promise<boolean> {
  const [seedUserCount, seedPersonCount] = await Promise.all([
    db.user.count({
      where: {
        oktaUserId: { startsWith: 'okta-' },
      },
    }),
    db.person.count({
      where: {
        tallyRespondentId: { startsWith: 'tally-resp-' },
      },
    }),
  ]);

  return seedUserCount > 0 || seedPersonCount > 0;
}

/**
 * Remove all seed data from the database
 *
 * This function removes sample/test data created by the seed script,
 * preparing the database for production use. It:
 * 1. Identifies seed users by oktaUserId pattern (starts with 'okta-')
 * 2. Identifies seed persons by tallyRespondentId pattern (starts with 'tally-resp-')
 * 3. Cascades deletion to related records (applications, assessments, etc.)
 *
 * @param currentUserDbId - Optional ID of current user to protect from deletion
 * @returns Counts of removed records by type
 */
export async function cleanupSeedData(currentUserDbId?: string): Promise<SeedCleanupResult> {
  console.log('[Seed Cleanup] Starting seed data cleanup...');

  // Find seed users (those with oktaUserId starting with 'okta-')
  const seedUsers = await db.user.findMany({
    where: {
      oktaUserId: { startsWith: 'okta-' },
    },
    select: { id: true, email: true },
  });

  // Find seed persons (those with tallyRespondentId starting with 'tally-resp-')
  const seedPersons = await db.person.findMany({
    where: {
      tallyRespondentId: { startsWith: 'tally-resp-' },
    },
    select: { id: true, email: true },
  });

  const seedUserIds = seedUsers.map((u) => u.id);
  const seedPersonIds = seedPersons.map((p) => p.id);

  console.log(`[Seed Cleanup] Found ${seedUsers.length} seed users and ${seedPersons.length} seed persons`);

  if (seedUsers.length === 0 && seedPersons.length === 0) {
    console.log('[Seed Cleanup] No seed data found, nothing to clean up');
    return {
      usersRemoved: 0,
      personsRemoved: 0,
      applicationsRemoved: 0,
      assessmentsRemoved: 0,
      interviewsRemoved: 0,
      decisionsRemoved: 0,
      auditLogsRemoved: 0,
      emailLogsRemoved: 0,
    };
  }

  // Use a transaction to ensure all deletions happen atomically
  const result = await db.$transaction(async (tx) => {
    // 1. Delete email logs associated with seed persons or sent by seed users
    const emailLogsDeleted = await tx.emailLog.deleteMany({
      where: {
        OR: [
          { personId: { in: seedPersonIds } },
          { sentBy: { in: seedUserIds } },
        ],
      },
    });

    // 2. Delete audit logs associated with seed persons or created by seed users
    const auditLogsDeleted = await tx.auditLog.deleteMany({
      where: {
        OR: [
          { personId: { in: seedPersonIds } },
          { userId: { in: seedUserIds } },
        ],
      },
    });

    // 3. Get seed applications (to delete their related records)
    const seedApplications = await tx.application.findMany({
      where: { personId: { in: seedPersonIds } },
      select: { id: true },
    });
    const seedApplicationIds = seedApplications.map((a) => a.id);

    // 4. Delete decisions for seed applications
    const decisionsDeleted = await tx.decision.deleteMany({
      where: {
        OR: [
          { applicationId: { in: seedApplicationIds } },
          { decidedBy: { in: seedUserIds } },
        ],
      },
    });

    // 5. Delete interviews for seed applications
    const interviewsDeleted = await tx.interview.deleteMany({
      where: {
        OR: [
          { applicationId: { in: seedApplicationIds } },
          { interviewerId: { in: seedUserIds } },
        ],
      },
    });

    // 6. Delete assessments for seed persons/applications
    const assessmentsDeleted = await tx.assessment.deleteMany({
      where: {
        OR: [
          { personId: { in: seedPersonIds } },
          { applicationId: { in: seedApplicationIds } },
        ],
      },
    });

    // 7. Delete applications for seed persons
    const applicationsDeleted = await tx.application.deleteMany({
      where: { personId: { in: seedPersonIds } },
    });

    // 8. Delete seed persons
    const personsDeleted = await tx.person.deleteMany({
      where: { id: { in: seedPersonIds } },
    });

    // 9. Delete seed users (excluding current user for safety)
    const userIdsToDelete = currentUserDbId
      ? seedUserIds.filter((id) => id !== currentUserDbId)
      : seedUserIds;

    const usersDeleted = await tx.user.deleteMany({
      where: { id: { in: userIdsToDelete } },
    });

    return {
      usersRemoved: usersDeleted.count,
      personsRemoved: personsDeleted.count,
      applicationsRemoved: applicationsDeleted.count,
      assessmentsRemoved: assessmentsDeleted.count,
      interviewsRemoved: interviewsDeleted.count,
      decisionsRemoved: decisionsDeleted.count,
      auditLogsRemoved: auditLogsDeleted.count,
      emailLogsRemoved: emailLogsDeleted.count,
    };
  });

  console.log('[Seed Cleanup] Cleanup completed:', result);
  return result;
}
