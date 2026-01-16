/**
 * Database Seed Script
 *
 * This script populates the database with sample data for development and testing.
 * Run with: npx prisma db seed
 *
 * What this creates:
 * - 2 sample users (1 admin, 1 hiring manager)
 * - 5 sample candidates at different pipeline stages
 * - Sample assessments, interviews, and decisions
 * - Sample audit logs
 */

import 'dotenv/config';
import { PrismaClient, Stage, Status, Clearance, AssessmentType, InterviewOutcome, DecisionType, ActionType, EmailStatus } from '../node_modules/.prisma/client/client';
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

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Clear existing data (in reverse order of dependencies)
  console.log('Clearing existing data...');
  await prisma.emailLog.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.decision.deleteMany();
  await prisma.interview.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.user.deleteMany();
  console.log('✓ Existing data cleared\n');

  // Create Users
  console.log('Creating users...');
  const adminUser = await prisma.user.create({
    data: {
      oktaUserId: 'okta-admin-001',
      email: 'admin@alterna.org',
      firstName: 'Ana',
      lastName: 'Martinez',
      displayName: 'Ana Martinez',
      title: 'HR Director',
      city: 'Austin',
      state: 'TX',
      countryCode: 'US',
      operationalClearance: Clearance.C,
      isAdmin: true,
      schedulingLink: 'https://cal.com/ana-martinez/interview',
      lastSyncedAt: new Date(),
    },
  });

  const hiringManager = await prisma.user.create({
    data: {
      oktaUserId: 'okta-manager-001',
      email: 'carlos@alterna.org',
      firstName: 'Carlos',
      lastName: 'Rodriguez',
      displayName: 'Carlos Rodriguez',
      title: 'Engineering Manager',
      city: 'Mexico City',
      countryCode: 'MX',
      operationalClearance: Clearance.B,
      isAdmin: false,
      schedulingLink: 'https://calendly.com/carlos-rodriguez/30min',
      lastSyncedAt: new Date(),
    },
  });
  console.log(`✓ Created ${2} users\n`);

  // Create Candidates at different stages
  console.log('Creating candidates...');

  // Candidate 1: Just applied
  const candidate1 = await prisma.candidate.create({
    data: {
      who: 'tally-resp-001',
      position: 'Software Developer',
      firstName: 'Maria',
      lastName: 'Garcia',
      email: 'maria.garcia@email.com',
      phoneNumber: '+1-555-0101',
      country: 'United States',
      countryCode: 'US',
      city: 'San Francisco',
      state: 'CA',
      educationLevel: "Bachelor's Degree",
      academicBackground: 'Computer Science from UC Berkeley',
      previousExperience: '3 years as a frontend developer at a startup',
      portfolioLink: 'https://mariagarcia.dev',
      resumeUrl: 'https://tally.so/r/resume-001.pdf',
      videoLink: 'https://youtube.com/watch?v=intro001',
      currentStage: Stage.APPLICATION,
      status: Status.ACTIVE,
      tallySubmissionId: 'tally-sub-001',
      tallyResponseId: 'tally-res-001',
    },
  });

  // Candidate 2: Passed general competencies
  const candidate2 = await prisma.candidate.create({
    data: {
      who: 'tally-resp-002',
      position: 'Instructional Designer',
      firstName: 'Juan',
      lastName: 'Lopez',
      email: 'juan.lopez@email.com',
      phoneNumber: '+52-555-0102',
      country: 'Mexico',
      countryCode: 'MX',
      city: 'Guadalajara',
      educationLevel: "Master's Degree",
      academicBackground: 'Educational Technology from ITESM',
      previousExperience: '5 years designing e-learning courses',
      currentStage: Stage.SPECIALIZED_COMPETENCIES,
      status: Status.ACTIVE,
      tallySubmissionId: 'tally-sub-002',
      tallyResponseId: 'tally-res-002',
    },
  });

  // Candidate 3: In interview stage
  const candidate3 = await prisma.candidate.create({
    data: {
      who: 'tally-resp-003',
      position: 'Course Facilitator',
      firstName: 'Sofia',
      lastName: 'Hernandez',
      email: 'sofia.h@email.com',
      phoneNumber: '+1-555-0103',
      country: 'United States',
      countryCode: 'US',
      city: 'Miami',
      state: 'FL',
      educationLevel: "Bachelor's Degree",
      academicBackground: 'Education from FIU',
      previousExperience: '2 years as teaching assistant',
      currentStage: Stage.INTERVIEW,
      status: Status.ACTIVE,
      tallySubmissionId: 'tally-sub-003',
      tallyResponseId: 'tally-res-003',
    },
  });

  // Candidate 4: Accepted, in agreement stage
  const candidate4 = await prisma.candidate.create({
    data: {
      who: 'tally-resp-004',
      position: 'Video Editor',
      firstName: 'Diego',
      lastName: 'Ramirez',
      email: 'diego.r@email.com',
      phoneNumber: '+503-555-0104',
      country: 'El Salvador',
      countryCode: 'SV',
      city: 'San Salvador',
      educationLevel: "Bachelor's Degree",
      academicBackground: 'Film Production',
      previousExperience: '4 years editing educational content',
      portfolioLink: 'https://vimeo.com/diegoramirez',
      currentStage: Stage.AGREEMENT,
      status: Status.ACTIVE,
      tallySubmissionId: 'tally-sub-004',
      tallyResponseId: 'tally-res-004',
    },
  });

  // Candidate 5: Rejected
  const candidate5 = await prisma.candidate.create({
    data: {
      who: 'tally-resp-005',
      position: 'Software Developer',
      firstName: 'Pedro',
      lastName: 'Santos',
      email: 'pedro.s@email.com',
      country: 'Brazil',
      countryCode: 'BR',
      educationLevel: 'Some College',
      currentStage: Stage.GENERAL_COMPETENCIES,
      status: Status.REJECTED,
      tallySubmissionId: 'tally-sub-005',
      tallyResponseId: 'tally-res-005',
    },
  });
  console.log(`✓ Created ${5} candidates\n`);

  // Create Assessments
  console.log('Creating assessments...');
  await prisma.assessment.createMany({
    data: [
      // Candidate 2: Passed general, taking specialized
      {
        candidateId: candidate2.id,
        assessmentType: AssessmentType.GENERAL_COMPETENCIES,
        score: 82.5,
        passed: true,
        threshold: 70,
        completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      },
      // Candidate 3: Passed both
      {
        candidateId: candidate3.id,
        assessmentType: AssessmentType.GENERAL_COMPETENCIES,
        score: 88.0,
        passed: true,
        threshold: 70,
        completedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      },
      {
        candidateId: candidate3.id,
        assessmentType: AssessmentType.SPECIALIZED_COMPETENCIES,
        score: 79.5,
        passed: true,
        threshold: 75,
        completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      },
      // Candidate 4: Passed both
      {
        candidateId: candidate4.id,
        assessmentType: AssessmentType.GENERAL_COMPETENCIES,
        score: 91.0,
        passed: true,
        threshold: 70,
        completedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), // 21 days ago
      },
      {
        candidateId: candidate4.id,
        assessmentType: AssessmentType.SPECIALIZED_COMPETENCIES,
        score: 85.0,
        passed: true,
        threshold: 75,
        completedAt: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000), // 17 days ago
      },
      // Candidate 5: Failed general
      {
        candidateId: candidate5.id,
        assessmentType: AssessmentType.GENERAL_COMPETENCIES,
        score: 55.0,
        passed: false,
        threshold: 70,
        completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      },
    ],
  });
  console.log(`✓ Created ${6} assessments\n`);

  // Create Interviews
  console.log('Creating interviews...');
  await prisma.interview.create({
    data: {
      candidateId: candidate3.id,
      interviewerId: hiringManager.id,
      schedulingLink: hiringManager.schedulingLink!,
      scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      outcome: InterviewOutcome.PENDING,
      emailSentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    },
  });

  await prisma.interview.create({
    data: {
      candidateId: candidate4.id,
      interviewerId: adminUser.id,
      schedulingLink: adminUser.schedulingLink!,
      scheduledAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      notes: 'Excellent communication skills. Strong portfolio. Recommended for hire.',
      outcome: InterviewOutcome.ACCEPT,
      emailSentAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`✓ Created ${2} interviews\n`);

  // Create Decisions
  console.log('Creating decisions...');
  await prisma.decision.create({
    data: {
      candidateId: candidate4.id,
      decision: DecisionType.ACCEPT,
      reason: 'Strong technical skills, excellent cultural fit, and impressive portfolio.',
      decidedBy: adminUser.id,
      decidedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    },
  });

  await prisma.decision.create({
    data: {
      candidateId: candidate5.id,
      decision: DecisionType.REJECT,
      reason: 'Did not meet minimum threshold for general competencies assessment.',
      decidedBy: adminUser.id,
      decidedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
    },
  });
  console.log(`✓ Created ${2} decisions\n`);

  // Create Audit Logs
  console.log('Creating audit logs...');
  await prisma.auditLog.createMany({
    data: [
      {
        candidateId: candidate1.id,
        action: 'Application received via Tally webhook',
        actionType: ActionType.CREATE,
        details: { source: 'tally_webhook', formId: 'form-001' },
        createdAt: candidate1.createdAt,
      },
      {
        candidateId: candidate2.id,
        userId: adminUser.id,
        action: 'Stage changed to Specialized Competencies',
        actionType: ActionType.STAGE_CHANGE,
        details: { from: 'GENERAL_COMPETENCIES', to: 'SPECIALIZED_COMPETENCIES' },
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        candidateId: candidate4.id,
        userId: adminUser.id,
        action: 'Candidate accepted',
        actionType: ActionType.STATUS_CHANGE,
        details: { decision: 'ACCEPT' },
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        candidateId: candidate5.id,
        userId: adminUser.id,
        action: 'Candidate rejected',
        actionType: ActionType.STATUS_CHANGE,
        details: { decision: 'REJECT', reason: 'Failed assessment' },
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
    ],
  });
  console.log(`✓ Created ${4} audit logs\n`);

  // Create Email Logs
  console.log('Creating email logs...');
  await prisma.emailLog.createMany({
    data: [
      {
        candidateId: candidate1.id,
        recipientEmail: candidate1.email,
        templateName: 'application-received',
        subject: 'Application Received - Alterna',
        status: EmailStatus.SENT,
        sentAt: candidate1.createdAt,
      },
      {
        candidateId: candidate3.id,
        recipientEmail: candidate3.email,
        templateName: 'interview-invitation',
        subject: 'Interview Invitation - Alterna',
        status: EmailStatus.SENT,
        sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        sentBy: hiringManager.id,
      },
      {
        candidateId: candidate4.id,
        recipientEmail: candidate4.email,
        templateName: 'offer-letter',
        subject: 'Offer Letter - Alterna',
        status: EmailStatus.SENT,
        sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        sentBy: adminUser.id,
      },
      {
        candidateId: candidate5.id,
        recipientEmail: candidate5.email,
        templateName: 'rejection',
        subject: 'Application Update - Alterna',
        status: EmailStatus.SENT,
        sentAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        sentBy: adminUser.id,
      },
    ],
  });
  console.log(`✓ Created ${4} email logs\n`);

  console.log('✅ Database seeded successfully!\n');
  console.log('Summary:');
  console.log('  - 2 users (1 admin, 1 hiring manager)');
  console.log('  - 5 candidates at various stages');
  console.log('  - 6 assessments');
  console.log('  - 2 interviews');
  console.log('  - 2 decisions');
  console.log('  - 4 audit logs');
  console.log('  - 4 email logs');
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
