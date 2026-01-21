/**
 * Database Seed Script
 *
 * This script populates the database with sample data for development and testing.
 * Run with: npx prisma db seed
 *
 * IMPORTANT: By default, real users (synced from Okta) are PRESERVED.
 * Only sample users (with oktaUserId starting with 'okta-') are deleted.
 * To delete all users including real ones, use: npx prisma db seed -- --clean
 *
 * What this creates:
 * - 2 sample users (1 admin, 1 hiring manager)
 * - 5 sample persons (unique individuals)
 * - 6 sample applications (including one person with 2 applications)
 * - Sample assessments (general on Person, specialized on Application)
 * - Sample interviews and decisions
 * - Sample audit logs and email logs
 */

import 'dotenv/config';
import {
  PrismaClient,
  Stage,
  Status,
  Clearance,
  AssessmentType,
  InterviewOutcome,
  DecisionType,
  ActionType,
  EmailStatus,
  OktaStatus,
} from '../lib/generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

// Parse DATABASE_URL for connection parameters
function parseDbUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '3306', 10),
    user: parsed.username,
    password: parsed.password,
    database: parsed.pathname.slice(1),
  };
}

// Create adapter for MySQL connection
const dbUrl = process.env.DATABASE_URL!;
const config = parseDbUrl(dbUrl);
const adapter = new PrismaMariaDb({
  host: config.host,
  port: config.port,
  user: config.user,
  password: config.password,
  database: config.database,
  connectionLimit: 5,
});

const prisma = new PrismaClient({ adapter });

// Check for --clean flag to delete real users too
const cleanMode = process.argv.includes('--clean');

async function main() {
  console.log('🌱 Starting database seed...\n');

  if (cleanMode) {
    console.log('⚠️  Running in CLEAN mode - all data including real users will be deleted\n');
  }

  // Preserve real users (those synced from Okta, not sample data)
  // Real users have oktaUserId that doesn't start with 'okta-' prefix
  const realUsers = cleanMode ? [] : await prisma.user.findMany({
    where: {
      NOT: {
        oktaUserId: {
          startsWith: 'okta-',
        },
      },
    },
  });

  if (realUsers.length > 0) {
    console.log(`📌 Preserving ${realUsers.length} real user(s): ${realUsers.map(u => u.email).join(', ')}\n`);
  }

  // Clear existing data (in reverse order of dependencies)
  console.log('Clearing existing data...');
  await prisma.emailLog.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.decision.deleteMany();
  await prisma.interview.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.application.deleteMany();
  await prisma.person.deleteMany();
  
  // Only delete sample users, preserve real ones
  if (cleanMode) {
    await prisma.user.deleteMany();
  } else {
    await prisma.user.deleteMany({
      where: {
        oktaUserId: {
          startsWith: 'okta-',
        },
      },
    });
  }
  console.log('✓ Existing data cleared\n');

  // Create Users (Alterna personnel)
  console.log('Creating users...');
  const adminUser = await prisma.user.create({
    data: {
      oktaUserId: 'okta-admin-001',
      email: 'admin@alterna.dev',
      firstName: 'Ana',
      lastName: 'Martinez',
      displayName: 'Ana Martinez',
      title: 'HR Director',
      city: 'Austin',
      state: 'TX',
      countryCode: 'US',
      operationalClearance: Clearance.C,
      isAdmin: true,
      hasAppAccess: true,
      schedulingLink: 'https://cal.com/ana-martinez/interview',
      lastSyncedAt: new Date(),
    },
  });

  const hiringManager = await prisma.user.create({
    data: {
      oktaUserId: 'okta-manager-001',
      email: 'carlos@alterna.dev',
      firstName: 'Carlos',
      lastName: 'Rodriguez',
      displayName: 'Carlos Rodriguez',
      title: 'Engineering Manager',
      city: 'Mexico City',
      countryCode: 'MX',
      operationalClearance: Clearance.B,
      isAdmin: false,
      hasAppAccess: true,
      schedulingLink: 'https://calendly.com/carlos-rodriguez/30min',
      lastSyncedAt: new Date(),
    },
  });
  console.log(`✓ Created 2 users\n`);

  // Create Persons (unique individuals identified by email)
  console.log('Creating persons...');

  // Person 1: Maria Garcia - Just applied, hasn't taken GC yet
  const person1 = await prisma.person.create({
    data: {
      email: 'maria.garcia@email.com',
      firstName: 'Maria',
      lastName: 'Garcia',
      phoneNumber: '+1-555-0101',
      country: 'United States',
      countryCode: 'US',
      city: 'San Francisco',
      state: 'CA',
      educationLevel: "Bachelor's Degree",
      portfolioLink: 'https://mariagarcia.dev',
      generalCompetenciesCompleted: false,
      tallyRespondentId: 'tally-resp-001',
    },
  });

  // Person 2: Juan Lopez - Passed GC, taking specialized
  const person2 = await prisma.person.create({
    data: {
      email: 'juan.lopez@email.com',
      firstName: 'Juan',
      lastName: 'Lopez',
      phoneNumber: '+52-555-0102',
      country: 'Mexico',
      countryCode: 'MX',
      city: 'Guadalajara',
      educationLevel: "Master's Degree",
      generalCompetenciesCompleted: true,
      generalCompetenciesScore: 82.5,
      generalCompetenciesPassedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      tallyRespondentId: 'tally-resp-002',
    },
  });

  // Person 3: Sofia Hernandez - Passed both assessments, in interview
  const person3 = await prisma.person.create({
    data: {
      email: 'sofia.h@email.com',
      firstName: 'Sofia',
      lastName: 'Hernandez',
      phoneNumber: '+1-555-0103',
      country: 'United States',
      countryCode: 'US',
      city: 'Miami',
      state: 'FL',
      educationLevel: "Bachelor's Degree",
      generalCompetenciesCompleted: true,
      generalCompetenciesScore: 88.0,
      generalCompetenciesPassedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      tallyRespondentId: 'tally-resp-003',
    },
  });

  // Person 4: Diego Ramirez - Accepted, in agreement stage
  const person4 = await prisma.person.create({
    data: {
      email: 'diego.r@email.com',
      firstName: 'Diego',
      lastName: 'Ramirez',
      phoneNumber: '+503-555-0104',
      country: 'El Salvador',
      countryCode: 'SV',
      city: 'San Salvador',
      educationLevel: "Bachelor's Degree",
      portfolioLink: 'https://vimeo.com/diegoramirez',
      generalCompetenciesCompleted: true,
      generalCompetenciesScore: 91.0,
      generalCompetenciesPassedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      tallyRespondentId: 'tally-resp-004',
    },
  });

  // Person 5: Pedro Santos - Failed GC, rejected
  const person5 = await prisma.person.create({
    data: {
      email: 'pedro.s@email.com',
      firstName: 'Pedro',
      lastName: 'Santos',
      country: 'Brazil',
      countryCode: 'BR',
      educationLevel: 'Some College',
      generalCompetenciesCompleted: true,
      generalCompetenciesScore: 55.0,
      // No generalCompetenciesPassedAt because they failed
      tallyRespondentId: 'tally-resp-005',
    },
  });
  console.log(`✓ Created 5 persons\n`);

  // Create Applications (one or more per person)
  console.log('Creating applications...');

  // Application 1: Maria's Software Developer application
  const app1 = await prisma.application.create({
    data: {
      personId: person1.id,
      position: 'Software Developer',
      currentStage: Stage.APPLICATION,
      status: Status.ACTIVE,
      academicBackground: 'Computer Science from UC Berkeley',
      previousExperience: '3 years as a frontend developer at a startup',
      resumeUrl: 'https://tally.so/r/resume-001.pdf',
      videoLink: 'https://youtube.com/watch?v=intro001',
      hasResume: true,
      hasAcademicBg: true,
      hasVideoIntro: true,
      hasPreviousExp: true,
      tallySubmissionId: 'tally-sub-001',
      tallyResponseId: 'tally-res-001',
      tallyFormId: 'form-application-001',
    },
  });

  // Application 2: Juan's Instructional Designer application
  const app2 = await prisma.application.create({
    data: {
      personId: person2.id,
      position: 'Instructional Designer',
      currentStage: Stage.SPECIALIZED_COMPETENCIES,
      status: Status.ACTIVE,
      academicBackground: 'Educational Technology from ITESM',
      previousExperience: '5 years designing e-learning courses',
      hasAcademicBg: true,
      hasPreviousExp: true,
      tallySubmissionId: 'tally-sub-002',
      tallyResponseId: 'tally-res-002',
      tallyFormId: 'form-application-001',
    },
  });

  // Application 3: Sofia's Course Facilitator application
  const app3 = await prisma.application.create({
    data: {
      personId: person3.id,
      position: 'Course Facilitator',
      currentStage: Stage.INTERVIEW,
      status: Status.ACTIVE,
      academicBackground: 'Education from FIU',
      previousExperience: '2 years as teaching assistant',
      hasAcademicBg: true,
      hasPreviousExp: true,
      tallySubmissionId: 'tally-sub-003',
      tallyResponseId: 'tally-res-003',
      tallyFormId: 'form-application-001',
    },
  });

  // Application 4: Diego's Video Editor application
  const app4 = await prisma.application.create({
    data: {
      personId: person4.id,
      position: 'Video Editor',
      currentStage: Stage.AGREEMENT,
      status: Status.ACTIVE,
      academicBackground: 'Film Production',
      previousExperience: '4 years editing educational content',
      hasAcademicBg: true,
      hasPreviousExp: true,
      tallySubmissionId: 'tally-sub-004',
      tallyResponseId: 'tally-res-004',
      tallyFormId: 'form-application-001',
    },
  });

  // Application 5: Pedro's Software Developer application (rejected)
  const app5 = await prisma.application.create({
    data: {
      personId: person5.id,
      position: 'Software Developer',
      currentStage: Stage.GENERAL_COMPETENCIES,
      status: Status.REJECTED,
      tallySubmissionId: 'tally-sub-005',
      tallyResponseId: 'tally-res-005',
      tallyFormId: 'form-application-001',
    },
  });

  // Application 6: Maria also applied for Content Writer (demonstrating multi-application)
  const app6 = await prisma.application.create({
    data: {
      personId: person1.id,
      position: 'Content Writer',
      currentStage: Stage.APPLICATION,
      status: Status.ACTIVE,
      academicBackground: 'English Literature minor at UC Berkeley',
      previousExperience: 'Technical writing for documentation',
      hasAcademicBg: true,
      hasPreviousExp: true,
      // Missing resume intentionally to test missing fields feature
      hasResume: true, // Claimed but not provided
      tallySubmissionId: 'tally-sub-006',
      tallyResponseId: 'tally-res-006',
      tallyFormId: 'form-application-001',
    },
  });
  console.log(`✓ Created 6 applications\n`);

  // Create Assessments
  console.log('Creating assessments...');

  // General Competencies assessments (linked to Person)
  await prisma.assessment.createMany({
    data: [
      // Person 2 (Juan): Passed GC
      {
        personId: person2.id,
        assessmentType: AssessmentType.GENERAL_COMPETENCIES,
        score: 82.5,
        passed: true,
        threshold: 70,
        completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        tallySubmissionId: 'tally-gc-002',
        rawData: {
          environmentScore: 85,
          communicationsScore: 80,
          collaborationScore: 82,
          learnScore: 84,
          behaviourScore: 81,
        },
      },
      // Person 3 (Sofia): Passed GC
      {
        personId: person3.id,
        assessmentType: AssessmentType.GENERAL_COMPETENCIES,
        score: 88.0,
        passed: true,
        threshold: 70,
        completedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        tallySubmissionId: 'tally-gc-003',
        rawData: {
          environmentScore: 90,
          communicationsScore: 88,
          collaborationScore: 87,
          learnScore: 89,
          behaviourScore: 86,
        },
      },
      // Person 4 (Diego): Passed GC
      {
        personId: person4.id,
        assessmentType: AssessmentType.GENERAL_COMPETENCIES,
        score: 91.0,
        passed: true,
        threshold: 70,
        completedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
        tallySubmissionId: 'tally-gc-004',
        rawData: {
          environmentScore: 92,
          communicationsScore: 90,
          collaborationScore: 91,
          learnScore: 93,
          behaviourScore: 89,
        },
      },
      // Person 5 (Pedro): Failed GC
      {
        personId: person5.id,
        assessmentType: AssessmentType.GENERAL_COMPETENCIES,
        score: 55.0,
        passed: false,
        threshold: 70,
        completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        tallySubmissionId: 'tally-gc-005',
        rawData: {
          environmentScore: 52,
          communicationsScore: 58,
          collaborationScore: 55,
          learnScore: 54,
          behaviourScore: 56,
        },
      },
    ],
  });

  // Specialized Competencies assessments (linked to Application)
  await prisma.assessment.createMany({
    data: [
      // Application 3 (Sofia's Course Facilitator): Passed SC
      {
        applicationId: app3.id,
        assessmentType: AssessmentType.SPECIALIZED_COMPETENCIES,
        score: 79.5,
        passed: true,
        threshold: 75,
        completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        tallySubmissionId: 'tally-sc-003',
      },
      // Application 4 (Diego's Video Editor): Passed SC
      {
        applicationId: app4.id,
        assessmentType: AssessmentType.SPECIALIZED_COMPETENCIES,
        score: 85.0,
        passed: true,
        threshold: 75,
        completedAt: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000),
        tallySubmissionId: 'tally-sc-004',
      },
    ],
  });
  console.log(`✓ Created 6 assessments\n`);

  // Create Interviews (linked to Application)
  console.log('Creating interviews...');
  await prisma.interview.create({
    data: {
      applicationId: app3.id,
      interviewerId: hiringManager.id,
      schedulingLink: hiringManager.schedulingLink!,
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      outcome: InterviewOutcome.PENDING,
      emailSentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    },
  });

  await prisma.interview.create({
    data: {
      applicationId: app4.id,
      interviewerId: adminUser.id,
      schedulingLink: adminUser.schedulingLink!,
      scheduledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      notes: 'Excellent communication skills. Strong portfolio. Recommended for hire.',
      outcome: InterviewOutcome.ACCEPT,
      emailSentAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`✓ Created 2 interviews\n`);

  // Create Decisions (linked to Application)
  console.log('Creating decisions...');
  await prisma.decision.create({
    data: {
      applicationId: app4.id,
      decision: DecisionType.ACCEPT,
      reason: 'Strong technical skills, excellent cultural fit, and impressive portfolio.',
      decidedBy: adminUser.id,
      decidedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    },
  });

  await prisma.decision.create({
    data: {
      applicationId: app5.id,
      decision: DecisionType.REJECT,
      reason: 'Did not meet minimum threshold for general competencies assessment.',
      decidedBy: adminUser.id,
      decidedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
    },
  });
  console.log(`✓ Created 2 decisions\n`);

  // Create Audit Logs (can link to Person, Application, or both)
  console.log('Creating audit logs...');
  await prisma.auditLog.createMany({
    data: [
      // Application received
      {
        personId: person1.id,
        applicationId: app1.id,
        action: 'Application received via Tally webhook',
        actionType: ActionType.CREATE,
        details: { source: 'tally_webhook', formId: 'form-application-001' },
        createdAt: app1.createdAt,
      },
      // Second application from same person
      {
        personId: person1.id,
        applicationId: app6.id,
        action: 'Application received via Tally webhook',
        actionType: ActionType.CREATE,
        details: { source: 'tally_webhook', formId: 'form-application-001', note: 'Existing person, new application' },
        createdAt: app6.createdAt,
      },
      // Stage change
      {
        personId: person2.id,
        applicationId: app2.id,
        userId: adminUser.id,
        action: 'Stage changed to Specialized Competencies',
        actionType: ActionType.STAGE_CHANGE,
        details: { from: 'GENERAL_COMPETENCIES', to: 'SPECIALIZED_COMPETENCIES' },
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      // Acceptance
      {
        personId: person4.id,
        applicationId: app4.id,
        userId: adminUser.id,
        action: 'Application accepted',
        actionType: ActionType.STATUS_CHANGE,
        details: { decision: 'ACCEPT' },
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      // Rejection
      {
        personId: person5.id,
        applicationId: app5.id,
        userId: adminUser.id,
        action: 'Application rejected',
        actionType: ActionType.STATUS_CHANGE,
        details: { decision: 'REJECT', reason: 'Failed assessment' },
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
    ],
  });
  console.log(`✓ Created 5 audit logs\n`);

  // Create Email Logs (can link to Person, Application, or both)
  console.log('Creating email logs...');
  await prisma.emailLog.createMany({
    data: [
      // Application confirmation
      {
        personId: person1.id,
        applicationId: app1.id,
        recipientEmail: person1.email,
        templateName: 'application-received',
        subject: 'Application Received - Alterna',
        status: EmailStatus.SENT,
        sentAt: app1.createdAt,
      },
      // GC invitation (person-level email, not application-specific)
      {
        personId: person1.id,
        recipientEmail: person1.email,
        templateName: 'general-competencies-invitation',
        subject: 'Complete Your Assessment - Alterna',
        status: EmailStatus.SENT,
        sentAt: new Date(app1.createdAt.getTime() + 1000), // 1 second after application
      },
      // Interview invitation
      {
        personId: person3.id,
        applicationId: app3.id,
        recipientEmail: person3.email,
        templateName: 'interview-invitation',
        subject: 'Interview Invitation - Alterna',
        status: EmailStatus.SENT,
        sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        sentBy: hiringManager.id,
      },
      // Offer letter
      {
        personId: person4.id,
        applicationId: app4.id,
        recipientEmail: person4.email,
        templateName: 'offer-letter',
        subject: 'Offer Letter - Alterna',
        status: EmailStatus.SENT,
        sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        sentBy: adminUser.id,
      },
      // Rejection
      {
        personId: person5.id,
        applicationId: app5.id,
        recipientEmail: person5.email,
        templateName: 'rejection',
        subject: 'Application Update - Alterna',
        status: EmailStatus.SENT,
        sentAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        sentBy: adminUser.id,
      },
    ],
  });
  console.log(`✓ Created 5 email logs\n`);

  console.log('✅ Database seeded successfully!\n');
  console.log('Summary:');
  console.log('  - 2 sample users (1 admin, 1 hiring manager)');
  if (realUsers.length > 0) {
    console.log(`  - ${realUsers.length} real user(s) preserved`);
  }
  console.log('  - 5 persons (unique individuals)');
  console.log('  - 6 applications (including 2 from same person)');
  console.log('  - 6 assessments (4 GC on Persons, 2 SC on Applications)');
  console.log('  - 2 interviews');
  console.log('  - 2 decisions');
  console.log('  - 5 audit logs');
  console.log('  - 5 email logs');
  if (!cleanMode) {
    console.log('\n💡 Tip: Use --clean flag to delete real users too');
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error seeding database:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
