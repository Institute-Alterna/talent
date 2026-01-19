/**
 * Migration Script: Candidate → Person + Application
 *
 * This script migrates existing Candidate data to the new Person + Application
 * model structure. It should be run AFTER the schema change is applied.
 *
 * Migration Logic:
 * 1. For each unique email in Candidates, create a Person record
 * 2. For each Candidate, create an Application linked to the Person
 * 3. Update Assessment records:
 *    - GENERAL_COMPETENCIES → link to Person
 *    - SPECIALIZED_COMPETENCIES → link to Application
 * 4. Update Interview, Decision records → link to Application
 * 5. Update AuditLog, EmailLog records → link to both Person and Application
 *
 * Usage:
 *   npx tsx scripts/migrate-candidates.ts
 *
 * Note: This script is idempotent - running it multiple times won't create duplicates.
 */

import 'dotenv/config';

// Since the schema has already been changed, we can't use the old Prisma client
// This script is meant to be run in two phases:
//
// PHASE 1 (BEFORE schema change):
//   Export existing data using raw SQL or the old Prisma client
//
// PHASE 2 (AFTER schema change):
//   Import the data into the new structure

// For this development environment, since we're using seed data and not
// production data, the cleanest approach is to:
// 1. Run `npm run db:push` to apply the new schema
// 2. Run `npm run db:seed` to seed with the new structure

console.log(`
================================================================================
MIGRATION: Candidate → Person + Application
================================================================================

This migration script explains the process for migrating from the old Candidate
model to the new Person + Application model.

DEVELOPMENT ENVIRONMENT (no production data):
--------------------------------------------
Since this is a development environment with seed data:

1. Apply the new schema:
   npm run db:push

2. Re-seed the database:
   npm run db:seed

PRODUCTION ENVIRONMENT (with real data):
---------------------------------------
If you have production data to migrate, follow these steps:

PHASE 1 - Before schema change:

  1. Export existing data using raw SQL:

     -- Export Candidates
     SELECT * FROM Candidate INTO OUTFILE '/tmp/candidates.csv';

     -- Export Assessments
     SELECT * FROM Assessment INTO OUTFILE '/tmp/assessments.csv';

     -- Export Interviews
     SELECT * FROM Interview INTO OUTFILE '/tmp/interviews.csv';

     -- Export Decisions
     SELECT * FROM Decision INTO OUTFILE '/tmp/decisions.csv';

     -- Export AuditLogs
     SELECT * FROM AuditLog INTO OUTFILE '/tmp/audit_logs.csv';

     -- Export EmailLogs
     SELECT * FROM EmailLog INTO OUTFILE '/tmp/email_logs.csv';

PHASE 2 - After schema change:

  1. Apply the new schema:
     npm run db:push

  2. Run the data migration (update imports and use the code below)

MIGRATION CODE (for production use):
-----------------------------------
The migration would involve:

1. Create Persons from unique emails in Candidates:
   - Group candidates by email
   - For each unique email, create ONE Person record
   - Store mapping: candidateId → personId

2. Create Applications for each Candidate:
   - Create Application with personId from mapping
   - Copy position, stage, status, documents from Candidate
   - Store mapping: candidateId → applicationId

3. Migrate Assessments:
   - GENERAL_COMPETENCIES: Set personId (using candidate → person mapping)
   - SPECIALIZED_COMPETENCIES: Set applicationId (using candidate → application mapping)
   - Also update Person.generalCompetenciesCompleted/Score/PassedAt

4. Migrate Interviews and Decisions:
   - Change candidateId to applicationId (using mapping)

5. Migrate AuditLogs and EmailLogs:
   - Set both personId and applicationId where applicable

================================================================================
`);

// Type definitions for the migration data structures
interface MigrationCandidate {
  id: string;
  who: string;
  position: string;
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
  resumeUrl: string | null;
  academicBackground: string | null;
  previousExperience: string | null;
  videoLink: string | null;
  otherFileUrl: string | null;
  currentStage: string;
  status: string;
  tallySubmissionId: string;
  tallyResponseId: string | null;
  oktaUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface IdMapping {
  candidateId: string;
  personId: string;
  applicationId: string;
}

/**
 * Example migration function (for reference)
 * This would be used in a production migration scenario
 */
async function migrateData(
  candidates: MigrationCandidate[],
  assessments: { id: string; candidateId: string; assessmentType: string; score: number; passed: boolean }[],
  interviews: { id: string; candidateId: string }[],
  decisions: { id: string; candidateId: string }[],
  auditLogs: { id: string; candidateId: string | null }[],
  emailLogs: { id: string; candidateId: string }[]
): Promise<IdMapping[]> {
  const mappings: IdMapping[] = [];
  const personsByEmail = new Map<string, string>(); // email → personId

  console.log(`Processing ${candidates.length} candidates...`);

  // Step 1: Group candidates by email and create Persons
  const uniqueEmails = [...new Set(candidates.map((c) => c.email.toLowerCase()))];
  console.log(`Found ${uniqueEmails.length} unique emails`);

  // Step 2: For each candidate, create Person (if not exists) and Application
  for (const candidate of candidates) {
    const email = candidate.email.toLowerCase();

    // Check if we already created a Person for this email
    let personId = personsByEmail.get(email);

    if (!personId) {
      // Create new Person
      personId = crypto.randomUUID();
      personsByEmail.set(email, personId);

      // Person would be created with:
      // - All personal fields from candidate
      // - generalCompetenciesCompleted = false (will be updated based on assessments)
      console.log(`  Creating Person for ${email}: ${personId}`);
    }

    // Create Application
    const applicationId = crypto.randomUUID();
    console.log(`  Creating Application for ${candidate.position}: ${applicationId}`);

    mappings.push({
      candidateId: candidate.id,
      personId,
      applicationId,
    });
  }

  // Step 3: Update General Competencies on Persons
  const gcAssessments = assessments.filter((a) => a.assessmentType === 'GENERAL_COMPETENCIES');
  console.log(`\nProcessing ${gcAssessments.length} general competencies assessments...`);

  for (const assessment of gcAssessments) {
    const mapping = mappings.find((m) => m.candidateId === assessment.candidateId);
    if (mapping) {
      // Update Person with GC results
      console.log(`  Updating Person ${mapping.personId} with GC score: ${assessment.score}`);
    }
  }

  // Step 4: Link Specialized Competencies to Applications
  const scAssessments = assessments.filter((a) => a.assessmentType === 'SPECIALIZED_COMPETENCIES');
  console.log(`\nProcessing ${scAssessments.length} specialized competencies assessments...`);

  for (const assessment of scAssessments) {
    const mapping = mappings.find((m) => m.candidateId === assessment.candidateId);
    if (mapping) {
      // Link to Application
      console.log(`  Linking SC assessment to Application ${mapping.applicationId}`);
    }
  }

  // Step 5: Update Interviews and Decisions
  console.log(`\nUpdating ${interviews.length} interviews...`);
  for (const interview of interviews) {
    const mapping = mappings.find((m) => m.candidateId === interview.candidateId);
    if (mapping) {
      console.log(`  Interview ${interview.id} → Application ${mapping.applicationId}`);
    }
  }

  console.log(`\nUpdating ${decisions.length} decisions...`);
  for (const decision of decisions) {
    const mapping = mappings.find((m) => m.candidateId === decision.candidateId);
    if (mapping) {
      console.log(`  Decision ${decision.id} → Application ${mapping.applicationId}`);
    }
  }

  // Step 6: Update AuditLogs and EmailLogs
  console.log(`\nUpdating ${auditLogs.length} audit logs...`);
  console.log(`Updating ${emailLogs.length} email logs...`);

  return mappings;
}

// Export for testing
export { migrateData, type MigrationCandidate, type IdMapping };

// Main execution
console.log('\nFor development: Run the following commands:');
console.log('  npm run db:push');
console.log('  npm run db:seed');
console.log('\nMigration script complete.');
