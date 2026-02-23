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
 * - 10 sample persons (unique individuals)
 * - 11 sample applications (including one person with 2 applications)
 * - Sample assessments (general on Person, specialized on Application)
 * - Sample interviews and decisions
 * - Sample audit logs and email logs
 * - 1 person who has completed the full pipeline (SIGNED stage)
 * - Edge cases: interview completed but no decision, SC passed awaiting advance,
 *   rejected at interview stage
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
  console.log('Starting database seed...\n');

  if (cleanMode) {
    console.warn('Running in CLEAN mode - all data including real users will be deleted!\n');
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
    console.warn(`Preserving ${realUsers.length} real user(s).`);
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
  console.log('Creating fictional user records...');
  const adminUser = await prisma.user.create({
    data: {
      oktaUserId: 'okta-admin-001',
      email: 'alex@test.alterna.labs',
      firstName: 'Alex',
      lastName: 'Alterna',
      displayName: 'Alex Alterna',
      title: 'HR Director',
      city: 'Geneva',
      countryCode: 'CH',
      operationalClearance: Clearance.C,
      isAdmin: true,
      hasAppAccess: true,
      schedulingLink: 'https://cal.com/alex-alterna/interview',
      lastSyncedAt: new Date(),
    },
  });

  const hiringManager = await prisma.user.create({
    data: {
      oktaUserId: 'okta-manager-001',
      email: 'julian@test.alterna.labs',
      firstName: 'Julián',
      lastName: 'Ramírez',
      displayName: 'Julián Ramírez',
      title: 'Engineering Manager',
      city: 'Mítikäh',
      state: 'CDMX',
      countryCode: 'MX',
      operationalClearance: Clearance.B,
      isAdmin: false,
      hasAppAccess: true,
      schedulingLink: 'https://calendly.com/julian-ramirez/30min',
      lastSyncedAt: new Date(),
    },
  });
  console.log(`✓ Created 2 fictional user records\n`);

  // Create Persons (unique individuals identified by email)
  console.log('Creating fictional person records...');

  // Person 1: Robert Trigo - Just applied, hasn't taken GC yet
  const person1 = await prisma.person.create({
    data: {
      email: 'robert.trigo@test.alterna.labs',
      firstName: 'Robert',
      lastName: 'Trigo',
      phoneNumber: '+1-555-0101',
      country: 'United States',
      countryCode: 'US',
      city: 'Miami',
      state: 'FL',
      educationLevel: "Bachelor's Degree",
      portfolioLink: 'https://roberttrigo.dev',
      generalCompetenciesCompleted: false,
      tallyRespondentId: 'tally-resp-001',
    },
  });

  // Person 2: Maria Hernandez - Passed GC, taking specialized
  const person2 = await prisma.person.create({
    data: {
      email: 'maria.hernandez@test.alterna.labs',
      firstName: 'Maria',
      lastName: 'Hernandez',
      phoneNumber: '+52-555-0102',
      country: 'United States',
      countryCode: 'US',
      city: 'Miami',
      state: 'FL',
      educationLevel: "Master's Degree",
      generalCompetenciesCompleted: true,
      generalCompetenciesScore: 850,
      generalCompetenciesPassedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      tallyRespondentId: 'tally-resp-002',
    },
  });

  // Person 3: Jan Won Young - Passed both assessments, in interview
  const person3 = await prisma.person.create({
    data: {
      email: 'jan.wonyoung@test.alterna.labs',
      firstName: 'Jan',
      lastName: 'Won Young',
      phoneNumber: '+1-555-0103',
      country: 'South Korea',
      countryCode: 'KR',
      city: 'Seoul',
      state: 'Hannam-dong',
      educationLevel: "Bachelor's Degree",
      generalCompetenciesCompleted: true,
      generalCompetenciesScore: 920,
      generalCompetenciesPassedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      tallyRespondentId: 'tally-resp-003',
    },
  });

  // Person 4: Diego Ramirez - Accepted, in agreement stage
  const person4 = await prisma.person.create({
    data: {
      email: 'diego.ramirez@test.alterna.labs',
      firstName: 'Diego',
      lastName: 'Ramirez',
      phoneNumber: '+503-555-0104',
      country: 'El Salvador',
      countryCode: 'SV',
      city: 'San Salvador',
      state: 'San Salvador',
      educationLevel: "Bachelor's Degree",
      portfolioLink: 'https://vimeo.com/diegoramirez',
      generalCompetenciesCompleted: true,
      generalCompetenciesScore: 885,
      generalCompetenciesPassedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      tallyRespondentId: 'tally-resp-004',
    },
  });

  // Person 5: Pedro Santos - Failed GC, rejected
  const person5 = await prisma.person.create({
    data: {
      email: 'pedro.santos@test.alterna.labs',
      firstName: 'Pedro',
      lastName: 'Santos',
      country: 'Brazil',
      countryCode: 'BR',
      educationLevel: 'Some College',
      generalCompetenciesCompleted: true,
      generalCompetenciesScore: 650,
      // No generalCompetenciesPassedAt because they failed
      tallyRespondentId: 'tally-resp-005',
    },
  });

  // Person 6: Sarah Chen - Failed GC (score below threshold), not rejected yet
  const person6 = await prisma.person.create({
    data: {
      email: 'sarah.chen@test.alterna.labs',
      firstName: 'Sarah',
      lastName: 'Chen',
      phoneNumber: '+1-555-0106',
      country: 'Canada',
      countryCode: 'CA',
      city: 'Toronto',
      state: 'ON',
      educationLevel: "Bachelor's Degree",
      portfolioLink: 'https://sarahchen.design',
      generalCompetenciesCompleted: true,
      generalCompetenciesScore: 720,
      // No generalCompetenciesPassedAt because they failed
      tallyRespondentId: 'tally-resp-006',
    },
  });

  // Person 7: Amara Osei - Completed entire pipeline, signed agreement
  const person7 = await prisma.person.create({
    data: {
      email: 'amara.osei@test.alterna.labs',
      firstName: 'Amara',
      lastName: 'Osei',
      phoneNumber: '+233-555-0107',
      country: 'Ghana',
      countryCode: 'GH',
      city: 'Accra',
      state: 'Greater Accra',
      educationLevel: "Master's Degree",
      portfolioLink: 'https://amaraosei.com',
      generalCompetenciesCompleted: true,
      generalCompetenciesScore: 910,
      generalCompetenciesPassedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      tallyRespondentId: 'tally-resp-007',
    },
  });

  // Person 8: Fatou Diallo - Interview completed, awaiting decision
  const person8 = await prisma.person.create({
    data: {
      email: 'fatou.diallo@test.alterna.labs',
      firstName: 'Fatou',
      lastName: 'Diallo',
      phoneNumber: '+221-555-0108',
      country: 'Senegal',
      countryCode: 'SN',
      city: 'Dakar',
      state: 'Dakar',
      educationLevel: "Master's Degree",
      portfolioLink: 'https://fatoudiallo.org',
      generalCompetenciesCompleted: true,
      generalCompetenciesScore: 870,
      generalCompetenciesPassedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
      tallyRespondentId: 'tally-resp-008',
    },
  });

  // Person 9: Kenji Tanaka - SC passed, ready to advance to interview
  const person9 = await prisma.person.create({
    data: {
      email: 'kenji.tanaka@test.alterna.labs',
      firstName: 'Kenji',
      lastName: 'Tanaka',
      phoneNumber: '+81-555-0109',
      country: 'Japan',
      countryCode: 'JP',
      city: 'Tokyo',
      state: 'Tōkyō-to',
      educationLevel: "Bachelor's Degree",
      portfolioLink: 'https://kenjitanaka.dev',
      generalCompetenciesCompleted: true,
      generalCompetenciesScore: 880,
      generalCompetenciesPassedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      tallyRespondentId: 'tally-resp-009',
    },
  });

  // Person 10: Priya Sharma - Rejected after interview
  const person10 = await prisma.person.create({
    data: {
      email: 'priya.sharma@test.alterna.labs',
      firstName: 'Priya',
      lastName: 'Sharma',
      phoneNumber: '+91-555-0110',
      country: 'India',
      countryCode: 'IN',
      city: 'Mumbai',
      state: 'Maharashtra',
      educationLevel: "Master's Degree",
      generalCompetenciesCompleted: true,
      generalCompetenciesScore: 840,
      generalCompetenciesPassedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      tallyRespondentId: 'tally-resp-010',
    },
  });
  console.log(`✓ Created 10 fictional person records\n`);

  // Create Applications (one or more per person)
  console.log('Creating fictional application records...');

  // Application 1: Robert's Compliance Specialist application
  const app1 = await prisma.application.create({
    data: {
      personId: person1.id,
      position: 'Compliance Specialist',
      currentStage: Stage.APPLICATION,
      status: Status.ACTIVE,
      academicBackground: 'Legendary Computer Science teacher, now head of compsci at Miami Dade County Public Schools',
      previousExperience: 'Accelerated a tiny project some time ago',
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

  // Application 2: Maria's Instructional Designer application
  const app2 = await prisma.application.create({
    data: {
      personId: person2.id,
      position: 'Instructional Designer',
      currentStage: Stage.SPECIALIZED_COMPETENCIES,
      status: Status.ACTIVE,
      academicBackground: 'Educational Technology at FIU',
      previousExperience: 'building cybersecurity teams at Miami-Dade high schools',
      hasAcademicBg: true,
      hasPreviousExp: true,
      tallySubmissionId: 'tally-sub-002',
      tallyResponseId: 'tally-res-002',
      tallyFormId: 'form-application-001',
    },
  });

  // Application 3: Jan's Chief People Officer application
  const app3 = await prisma.application.create({
    data: {
      personId: person3.id,
      position: 'Chief People Officer',
      currentStage: Stage.INTERVIEW,
      status: Status.ACTIVE,
      academicBackground: 'Training in Performing Arts at Seoul National University',
      previousExperience: 'Singer and dancer in a small idol group',
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
      status: Status.ACCEPTED,
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
      personId: person2.id,
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

  // Application 7: Sarah's UX Designer application (failed GC, awaiting decision)
  const app7 = await prisma.application.create({
    data: {
      personId: person6.id,
      position: 'UX Designer',
      currentStage: Stage.GENERAL_COMPETENCIES,
      status: Status.ACTIVE,
      academicBackground: 'Human-Computer Interaction at University of Toronto',
      previousExperience: '3 years designing educational apps',
      resumeUrl: 'https://tally.so/r/resume-007.pdf',
      videoLink: 'https://vimeo.com/sarahchen',
      hasResume: true,
      hasAcademicBg: true,
      hasVideoIntro: true,
      hasPreviousExp: true,
      tallySubmissionId: 'tally-sub-007',
      tallyResponseId: 'tally-res-007',
      tallyFormId: 'form-application-001',
    },
  });

  // Application 8: Amara's Course Facilitator application (signed agreement)
  const app8 = await prisma.application.create({
    data: {
      personId: person7.id,
      position: 'Course Facilitator',
      currentStage: Stage.SIGNED,
      status: Status.ACCEPTED,
      academicBackground: 'M.Ed. in Curriculum and Instruction from University of Ghana',
      previousExperience: '5 years facilitating online learning programmes for NGOs across West Africa',
      resumeUrl: 'https://tally.so/r/resume-008.pdf',
      videoLink: 'https://youtube.com/watch?v=intro008',
      hasResume: true,
      hasAcademicBg: true,
      hasVideoIntro: true,
      hasPreviousExp: true,
      agreementSignedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      agreementTallySubmissionId: 'tally-agreement-008',
      agreementData: {
        applicationId: 'seed-app-008',
        legalFirstName: 'Amara',
        legalLastName: 'Osei',
        country: 'Ghana',
        biography: 'Experienced curriculum facilitator with over 5 years of experience in online learning programme delivery across West Africa.',
        dateOfBirth: '1992-03-15',
        privacyPolicyAccepted: true,
        signatureUrl: 'https://tally.so/r/signature-008.png',
        serviceHours: '30 hours per week',
      },
      tallySubmissionId: 'tally-sub-008',
      tallyResponseId: 'tally-res-008',
      tallyFormId: 'form-application-001',
    },
  });

  // Application 9: Fatou's Programme Coordinator application (interview completed, no decision)
  const app9 = await prisma.application.create({
    data: {
      personId: person8.id,
      position: 'Programme Coordinator',
      currentStage: Stage.INTERVIEW,
      status: Status.ACTIVE,
      academicBackground: 'M.A. in International Development from Université Cheikh Anta Diop',
      previousExperience: '4 years coordinating education programmes for NGOs in West Africa',
      resumeUrl: 'https://tally.so/r/resume-009.pdf',
      videoLink: 'https://youtube.com/watch?v=intro009',
      hasResume: true,
      hasAcademicBg: true,
      hasVideoIntro: true,
      hasPreviousExp: true,
      tallySubmissionId: 'tally-sub-009',
      tallyResponseId: 'tally-res-009',
      tallyFormId: 'form-application-001',
    },
  });

  // Application 10: Kenji's Data Analyst application (SC passed, ready for interview)
  const app10 = await prisma.application.create({
    data: {
      personId: person9.id,
      position: 'Data Analyst',
      currentStage: Stage.SPECIALIZED_COMPETENCIES,
      status: Status.ACTIVE,
      academicBackground: 'B.Sc. in Statistics from University of Tokyo',
      previousExperience: '3 years data analysis for international education research',
      resumeUrl: 'https://tally.so/r/resume-010.pdf',
      hasResume: true,
      hasAcademicBg: true,
      hasPreviousExp: true,
      tallySubmissionId: 'tally-sub-010',
      tallyResponseId: 'tally-res-010',
      tallyFormId: 'form-application-001',
    },
  });

  // Application 11: Priya's Curriculum Developer application (rejected at interview)
  const app11 = await prisma.application.create({
    data: {
      personId: person10.id,
      position: 'Curriculum Developer',
      currentStage: Stage.INTERVIEW,
      status: Status.REJECTED,
      academicBackground: 'M.Ed. in Educational Technology from IIT Bombay',
      previousExperience: '5 years developing digital learning materials for rural education initiatives',
      resumeUrl: 'https://tally.so/r/resume-011.pdf',
      videoLink: 'https://youtube.com/watch?v=intro011',
      hasResume: true,
      hasAcademicBg: true,
      hasVideoIntro: true,
      hasPreviousExp: true,
      tallySubmissionId: 'tally-sub-011',
      tallyResponseId: 'tally-res-011',
      tallyFormId: 'form-application-001',
    },
  });
  console.log(`✓ Created 11 fictional application records\n`);

  // Create Assessments
  console.log('Creating fictional assessment records...');

  // ----- Sample GCQ fields matching real Tally GCQ form structure -----
  // Field types: HIDDEN_FIELDS, CALCULATED_FIELDS, MULTIPLE_CHOICE, LINEAR_SCALE
  // Scores: composite score + 3 subscores (culture, situational, digital)
  // MULTIPLE_CHOICE value is an array of selected option IDs (strings)

  /** Options shared across many situational questions */
  const MC_OPTIONS = {
    identityVerification: [
      { id: 'd5658b27', text: 'Yes' },
      { id: 'ea89239d', text: 'No' },
    ],
    feedback: [
      { id: '063e278d', text: 'Schedule a meeting sometime next week to walk through it together' },
      { id: 'a80629e7', text: 'Leave comments on the project and record a short video message about it' },
      { id: '0de83576', text: 'Send messages in the Slack channel listing your feedback' },
      { id: '5b2af09d', text: 'Wait until the next chance to bring it up over a meeting' },
    ],
    lateDeliverable: [
      { id: '7fa6b914', text: 'Update the project timeline with the reason and expected resolution, with no further comment' },
      { id: '00d1f7dc', text: 'Wait until someone asks about the status before giving the bad news' },
      { id: '1981ecf3', text: 'Send a message explaining the reason and expected resolution, then update the project timeline' },
      { id: '5399b3be', text: 'Send a private message to your teammates and let them decide what to do about it' },
    ],
    vagueInstructions: [
      { id: '17384316', text: 'Start the task with what you understand and figure it out as you go' },
      { id: '9e3568a1', text: 'Wait until their time matches with yours to hop on a quick call to clarify' },
      { id: 'c7e5ef28', text: 'Send a message asking for clarification and begin what you can' },
      { id: 'abe4309b', text: 'Look for more information about what it could have meant online' },
    ],
    statusUpdate: [
      { id: 'd201939e', text: 'Type fast and keep the key points and next steps concise' },
      { id: '0fd635b6', text: 'Dump a voice memo onto AI and ask it to write it for you' },
      { id: '09c9e47f', text: 'Ask AI to gather the current status data and write it from there' },
      { id: '6df7fa15', text: 'Ask someone else to help you write the update' },
    ],
    dataError: [
      { id: '3bc939fa', text: 'Delete the original message and upload the corrected version immediately' },
      { id: 'c5dc1dc1', text: 'Flag exactly what changed and update the original document' },
      { id: '6336b72e', text: 'Wait to see if anyone catches the error before saying anything' },
      { id: '9a0c714e', text: 'Let a teammate know about the corrected data' },
    ],
    phishingEmail: [
      { id: '18f41187', text: 'The address on the browser bar once you click the link' },
      { id: '960ea02f', text: 'The email address that sent the message' },
      { id: 'a4401fd4', text: 'Whether your account details are correct' },
      { id: 'ea6735dc', text: 'Whether it looks like a real Google email' },
    ],
    sharedPassword: [
      { id: '3b48a6d3', text: 'Send the password through private messages' },
      { id: '53a3b271', text: 'Send the password through the team\'s channel' },
      { id: 'ef46f6c8', text: 'Use a password manager\'s sharing link, even if it\'s on an external service' },
      { id: '089ad11c', text: 'Call them to share the password over the phone' },
    ],
    bluntFeedback: [
      { id: 'db5968a9', text: 'Reply with context defending your decisions' },
      { id: '1ebc7b0c', text: 'Implement the changes you believe align best' },
      { id: '6a5dcfbb', text: 'Sit with it, and reply acknowledging you\'ve reviewed it and will follow up with any questions' },
      { id: 'f996cf5a', text: 'Delegate the changes to that teammate and work together on it' },
    ],
    outdatedDocs: [
      { id: 'a1a64bf6', text: 'It makes writing status updates more challenging' },
      { id: '9c2d4469', text: 'Anyone not in the daily conversations can\'t understand the project\'s real status' },
      { id: '6776d7ac', text: 'It looks unprofessional and messy' },
      { id: '6da92b14', text: 'The team will need more meetings to stay aligned' },
    ],
  };

  function buildGCQFields(opts: {
    personId: string;
    name: string;
    score: number;
    culture: number;
    situational: number;
    digital: number;
    /** LINEAR_SCALE values for the 10 culture questions (1-5 each) */
    scales: number[];
    /** Selected option IDs for the situational MC questions */
    situationalAnswers: string[];
    /** Selected option IDs for the digital MC questions */
    digitalAnswers: string[];
  }) {
    return [
      // Hidden fields
      { key: 'question_PzkEpx_9997dff6', label: 'who', type: 'HIDDEN_FIELDS', value: opts.personId },
      { key: 'question_Z2DVAV_ed354dcb', label: 'name', type: 'HIDDEN_FIELDS', value: opts.name },

      // Calculated scores
      { key: 'question_Q7k02g_fd603e44', label: 'score', type: 'CALCULATED_FIELDS', value: opts.score },
      { key: 'question_LdPQ1J_20114bac', label: 'cultureScore', type: 'CALCULATED_FIELDS', value: opts.culture },
      { key: 'question_pLDlxP_32ad58ef', label: 'situationalScore', type: 'CALCULATED_FIELDS', value: opts.situational },
      { key: 'question_J2ON0d_a9d6570e', label: 'digitalScore', type: 'CALCULATED_FIELDS', value: opts.digital },

      // Identity verification (MC)
      {
        key: 'question_N7dVx0', label: 'Identity Verification', type: 'MULTIPLE_CHOICE',
        value: ['d5658b27'], options: MC_OPTIONS.identityVerification,
      },

      // ── Culture (LINEAR_SCALE) ──
      { key: 'question_1r91Pb', label: 'When I\'m given a task with a reasonable deadline', type: 'LINEAR_SCALE', value: opts.scales[0] },
      { key: 'question_MAE9K8', label: 'When designing something others will use', type: 'LINEAR_SCALE', value: opts.scales[1] },
      { key: 'question_J2ONKX', label: 'When working on a project with many moving parts', type: 'LINEAR_SCALE', value: opts.scales[2] },
      { key: 'question_g59RjJ', label: 'When building a resource or tool for others', type: 'LINEAR_SCALE', value: opts.scales[3] },
      { key: 'question_ylJWZd', label: 'When I face a repetitive or time-consuming task', type: 'LINEAR_SCALE', value: opts.scales[4] },
      { key: 'question_Xe4Klz', label: 'When I make progress on a task or hit a blocker', type: 'LINEAR_SCALE', value: opts.scales[5] },
      { key: 'question_8dZ0or', label: 'When I have an idea that could improve how the team works', type: 'LINEAR_SCALE', value: opts.scales[6] },
      { key: 'question_0EeprA', label: 'When a topic needs to be discussed with the team', type: 'LINEAR_SCALE', value: opts.scales[7] },
      { key: 'question_zK7aXg', label: 'When I notice something going wrong on a project I\'m part of', type: 'LINEAR_SCALE', value: opts.scales[8] },
      { key: 'question_5dZyKQ', label: 'When I finish a piece of work I\'m proud of', type: 'LINEAR_SCALE', value: opts.scales[9] },

      // ── Situational (MULTIPLE_CHOICE) ──
      {
        key: 'question_Xe4KDj', label: 'You need to give detailed feedback on a teammate\'s work on a project. This isn\'t urgent.',
        type: 'MULTIPLE_CHOICE', value: [opts.situationalAnswers[0]], options: MC_OPTIONS.feedback,
      },
      {
        key: 'question_8dZ0KO', label: 'A deliverable you are in charge of is going to be two days late.',
        type: 'MULTIPLE_CHOICE', value: [opts.situationalAnswers[1]], options: MC_OPTIONS.lateDeliverable,
      },
      {
        key: 'question_0EepxN', label: 'You receive vague instructions for a complex task from a teammate in a different time zone.',
        type: 'MULTIPLE_CHOICE', value: [opts.situationalAnswers[2]], options: MC_OPTIONS.vagueInstructions,
      },
      {
        key: 'question_zK7aqa', label: 'You must write a short status update in the next 5 minutes because you will not be available until tomorrow.',
        type: 'MULTIPLE_CHOICE', value: [opts.situationalAnswers[3]], options: MC_OPTIONS.statusUpdate,
      },
      {
        key: 'question_5dZyz6', label: 'You shared data that you did not notice had a significant error. This data will be important for a decision later on.',
        type: 'MULTIPLE_CHOICE', value: [opts.situationalAnswers[4]], options: MC_OPTIONS.dataError,
      },
      {
        key: 'question_DV7lVq', label: 'A teammate sends you a video message walking through your work with blunt but valid feedback. You feel a bit defensive.',
        type: 'MULTIPLE_CHOICE', value: [opts.situationalAnswers[5]], options: MC_OPTIONS.bluntFeedback,
      },
      {
        key: 'question_lN6PNB', label: 'Your team communicates well, but your documentation and tasks are consistently out of date. What\'s the biggest risk?',
        type: 'MULTIPLE_CHOICE', value: [opts.situationalAnswers[6]], options: MC_OPTIONS.outdatedDocs,
      },

      // ── Digital (MULTIPLE_CHOICE) ──
      {
        key: 'question_OA7WA7', label: 'You receive an email that appears to be from Google with a link. What\'s the first you check?',
        type: 'MULTIPLE_CHOICE', value: [opts.digitalAnswers[0]], options: MC_OPTIONS.phishingEmail,
      },
      {
        key: 'question_ylJWD4', label: 'A teammate asks you to share the login for a shared account with the rest of the team.',
        type: 'MULTIPLE_CHOICE', value: [opts.digitalAnswers[1]], options: MC_OPTIONS.sharedPassword,
      },
    ];
  }

  // General Competencies assessments (linked to Person)
  await prisma.assessment.createMany({
    data: [
      // Person 2 (Maria): Passed GC — strong across the board
      {
        personId: person2.id,
        assessmentType: AssessmentType.GENERAL_COMPETENCIES,
        score: 850,
        passed: true,
        threshold: 800,
        completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        tallySubmissionId: 'tally-gc-002',
        rawData: {
          subscores: { cultureScore: 310, situationalScore: 290, digitalScore: 250 },
          fields: buildGCQFields({
            personId: person2.id, name: 'Maria Hernandez',
            score: 850, culture: 310, situational: 290, digital: 250,
            scales: [4, 5, 4, 4, 3, 4, 5, 4, 4, 5],
            situationalAnswers: ['a80629e7', '1981ecf3', 'c7e5ef28', 'd201939e', 'c5dc1dc1', '6a5dcfbb', '9c2d4469'],
            digitalAnswers: ['960ea02f', 'ef46f6c8'],
          }),
        },
      },
      // Person 3 (Jan): Passed GC — highest scorer
      {
        personId: person3.id,
        assessmentType: AssessmentType.GENERAL_COMPETENCIES,
        score: 920,
        passed: true,
        threshold: 800,
        completedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        tallySubmissionId: 'tally-gc-003',
        rawData: {
          subscores: { cultureScore: 340, situationalScore: 320, digitalScore: 260 },
          fields: buildGCQFields({
            personId: person3.id, name: 'Jan Won Young',
            score: 920, culture: 340, situational: 320, digital: 260,
            scales: [5, 5, 5, 4, 5, 5, 4, 5, 5, 5],
            situationalAnswers: ['a80629e7', '1981ecf3', 'c7e5ef28', 'd201939e', 'c5dc1dc1', '6a5dcfbb', '9c2d4469'],
            digitalAnswers: ['960ea02f', 'ef46f6c8'],
          }),
        },
      },
      // Person 4 (Diego): Passed GC — solid but not perfect
      {
        personId: person4.id,
        assessmentType: AssessmentType.GENERAL_COMPETENCIES,
        score: 885,
        passed: true,
        threshold: 800,
        completedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
        tallySubmissionId: 'tally-gc-004',
        rawData: {
          subscores: { cultureScore: 325, situationalScore: 300, digitalScore: 260 },
          fields: buildGCQFields({
            personId: person4.id, name: 'Diego Ramirez',
            score: 885, culture: 325, situational: 300, digital: 260,
            scales: [4, 5, 4, 5, 3, 4, 4, 4, 5, 4],
            situationalAnswers: ['063e278d', '1981ecf3', 'c7e5ef28', 'd201939e', 'c5dc1dc1', '1ebc7b0c', '9c2d4469'],
            digitalAnswers: ['960ea02f', 'ef46f6c8'],
          }),
        },
      },
      // Person 5 (Pedro): Failed GC — low scores across the board
      {
        personId: person5.id,
        assessmentType: AssessmentType.GENERAL_COMPETENCIES,
        score: 650,
        passed: false,
        threshold: 800,
        completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        tallySubmissionId: 'tally-gc-005',
        rawData: {
          subscores: { cultureScore: 220, situationalScore: 230, digitalScore: 200 },
          fields: buildGCQFields({
            personId: person5.id, name: 'Pedro Santos',
            score: 650, culture: 220, situational: 230, digital: 200,
            scales: [2, 3, 2, 2, 3, 2, 3, 2, 2, 3],
            situationalAnswers: ['063e278d', '7fa6b914', '17384316', '0fd635b6', '3bc939fa', 'db5968a9', 'a1a64bf6'],
            digitalAnswers: ['18f41187', '3b48a6d3'],
          }),
        },
      },
      // Person 6 (Sarah): Failed GC — borderline, awaiting rejection decision
      {
        personId: person6.id,
        assessmentType: AssessmentType.GENERAL_COMPETENCIES,
        score: 720,
        passed: false,
        threshold: 800,
        completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        tallySubmissionId: 'tally-gc-006',
        rawData: {
          subscores: { cultureScore: 260, situationalScore: 250, digitalScore: 210 },
          fields: buildGCQFields({
            personId: person6.id, name: 'Sarah Chen',
            score: 720, culture: 260, situational: 250, digital: 210,
            scales: [3, 4, 3, 3, 3, 3, 4, 3, 3, 4],
            situationalAnswers: ['a80629e7', '1981ecf3', '17384316', 'd201939e', '9a0c714e', '6a5dcfbb', '6da92b14'],
            digitalAnswers: ['960ea02f', '3b48a6d3'],
          }),
        },
      },
      // Person 7 (Amara): Passed GC — excellent scores
      {
        personId: person7.id,
        assessmentType: AssessmentType.GENERAL_COMPETENCIES,
        score: 910,
        passed: true,
        threshold: 800,
        completedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        tallySubmissionId: 'tally-gc-007',
        rawData: {
          subscores: { cultureScore: 335, situationalScore: 315, digitalScore: 260 },
          fields: buildGCQFields({
            personId: person7.id, name: 'Amara Osei',
            score: 910, culture: 335, situational: 315, digital: 260,
            scales: [5, 5, 4, 5, 4, 5, 5, 4, 5, 5],
            situationalAnswers: ['a80629e7', '1981ecf3', 'c7e5ef28', 'd201939e', 'c5dc1dc1', '6a5dcfbb', '9c2d4469'],
            digitalAnswers: ['960ea02f', 'ef46f6c8'],
          }),
        },
      },
      // Person 8 (Fatou): Passed GC — strong performer
      {
        personId: person8.id,
        assessmentType: AssessmentType.GENERAL_COMPETENCIES,
        score: 870,
        passed: true,
        threshold: 800,
        completedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
        tallySubmissionId: 'tally-gc-008',
        rawData: {
          subscores: { cultureScore: 320, situationalScore: 300, digitalScore: 250 },
          fields: buildGCQFields({
            personId: person8.id, name: 'Fatou Diallo',
            score: 870, culture: 320, situational: 300, digital: 250,
            scales: [4, 5, 4, 4, 4, 4, 5, 4, 4, 5],
            situationalAnswers: ['a80629e7', '1981ecf3', 'c7e5ef28', 'd201939e', 'c5dc1dc1', '6a5dcfbb', '9c2d4469'],
            digitalAnswers: ['960ea02f', 'ef46f6c8'],
          }),
        },
      },
      // Person 9 (Kenji): Passed GC — consistent scores
      {
        personId: person9.id,
        assessmentType: AssessmentType.GENERAL_COMPETENCIES,
        score: 880,
        passed: true,
        threshold: 800,
        completedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        tallySubmissionId: 'tally-gc-009',
        rawData: {
          subscores: { cultureScore: 330, situationalScore: 295, digitalScore: 255 },
          fields: buildGCQFields({
            personId: person9.id, name: 'Kenji Tanaka',
            score: 880, culture: 330, situational: 295, digital: 255,
            scales: [5, 4, 5, 4, 4, 5, 4, 4, 5, 4],
            situationalAnswers: ['a80629e7', '1981ecf3', 'c7e5ef28', 'd201939e', 'c5dc1dc1', '6a5dcfbb', '9c2d4469'],
            digitalAnswers: ['960ea02f', 'ef46f6c8'],
          }),
        },
      },
      // Person 10 (Priya): Passed GC — solid performance
      {
        personId: person10.id,
        assessmentType: AssessmentType.GENERAL_COMPETENCIES,
        score: 840,
        passed: true,
        threshold: 800,
        completedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
        tallySubmissionId: 'tally-gc-010',
        rawData: {
          subscores: { cultureScore: 305, situationalScore: 285, digitalScore: 250 },
          fields: buildGCQFields({
            personId: person10.id, name: 'Priya Sharma',
            score: 840, culture: 305, situational: 285, digital: 250,
            scales: [4, 4, 4, 4, 3, 4, 5, 4, 4, 4],
            situationalAnswers: ['a80629e7', '1981ecf3', 'c7e5ef28', 'd201939e', 'c5dc1dc1', '1ebc7b0c', '9c2d4469'],
            digitalAnswers: ['960ea02f', 'ef46f6c8'],
          }),
        },
      },
    ],
  });

  // Specialised Competencies assessments (linked to Application)
  await prisma.assessment.createMany({
    data: [
      // Application 3 (Jan's Chief People Officer): Passed SC
      {
        applicationId: app3.id,
        assessmentType: AssessmentType.SPECIALIZED_COMPETENCIES,
        score: 485,
        passed: true,
        threshold: 400,
        completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        tallySubmissionId: 'tally-sc-003',
      },
      // Application 4 (Diego's Video Editor): Passed SC
      {
        applicationId: app4.id,
        assessmentType: AssessmentType.SPECIALIZED_COMPETENCIES,
        score: 520,
        passed: true,
        threshold: 400,
        completedAt: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000),
        tallySubmissionId: 'tally-sc-004',
      },
      // Application 2 (Maria's Instructional Designer): Failed SC but can still interview
      {
        applicationId: app2.id,
        assessmentType: AssessmentType.SPECIALIZED_COMPETENCIES,
        score: 350,
        passed: false,
        threshold: 400,
        completedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        tallySubmissionId: 'tally-sc-002',
      },
      // Application 8 (Amara's Course Facilitator): Passed SC — strong performance
      {
        applicationId: app8.id,
        assessmentType: AssessmentType.SPECIALIZED_COMPETENCIES,
        score: 540,
        passed: true,
        threshold: 400,
        completedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
        tallySubmissionId: 'tally-sc-008',
      },
      // Application 9 (Fatou's Programme Coordinator): Passed SC
      {
        applicationId: app9.id,
        assessmentType: AssessmentType.SPECIALIZED_COMPETENCIES,
        score: 450,
        passed: true,
        threshold: 400,
        completedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
        tallySubmissionId: 'tally-sc-009',
      },
      // Application 10 (Kenji's Data Analyst): Passed SC — strong analytical skills
      {
        applicationId: app10.id,
        assessmentType: AssessmentType.SPECIALIZED_COMPETENCIES,
        score: 470,
        passed: true,
        threshold: 400,
        completedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
        tallySubmissionId: 'tally-sc-010',
      },
      // Application 11 (Priya's Curriculum Developer): Passed SC
      {
        applicationId: app11.id,
        assessmentType: AssessmentType.SPECIALIZED_COMPETENCIES,
        score: 420,
        passed: true,
        threshold: 400,
        completedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        tallySubmissionId: 'tally-sc-011',
      },
    ],
  });
  console.log(`✓ Created 16 fictional assessment records\n`);

  // Create Interviews (linked to Application)
  console.log('Creating fictional interview records...');
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

  // Amara's interview — completed and accepted
  await prisma.interview.create({
    data: {
      applicationId: app8.id,
      interviewerId: adminUser.id,
      schedulingLink: adminUser.schedulingLink!,
      scheduledAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      notes: 'Outstanding candidate. Deep experience in curriculum facilitation. Excellent cultural alignment and communication. Highly recommended.',
      outcome: InterviewOutcome.ACCEPT,
      emailSentAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
    },
  });

  // Fatou's interview — completed, awaiting formal decision
  await prisma.interview.create({
    data: {
      applicationId: app9.id,
      interviewerId: hiringManager.id,
      schedulingLink: hiringManager.schedulingLink!,
      scheduledAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      notes: 'Strong programme coordination experience. Excellent understanding of NGO operations. Good cultural fit. Recommend proceeding.',
      outcome: InterviewOutcome.ACCEPT,
      emailSentAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
  });

  // Priya's interview — completed, rejected
  await prisma.interview.create({
    data: {
      applicationId: app11.id,
      interviewerId: adminUser.id,
      schedulingLink: adminUser.schedulingLink!,
      scheduledAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      notes: 'Solid technical knowledge but struggled to articulate approach to inclusive curriculum design. Communication style may not align with team dynamics.',
      outcome: InterviewOutcome.REJECT,
      emailSentAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`✓ Created 5 fictional interview records\n`);

  // Create Decisions (linked to Application)
  console.log('Creating fictional decision records...');
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

  // Amara accepted — completed full pipeline
  await prisma.decision.create({
    data: {
      applicationId: app8.id,
      decision: DecisionType.ACCEPT,
      reason: 'Exceptional candidate with strong facilitation background, outstanding assessment scores, and excellent cultural fit. Unanimous recommendation from interview panel.',
      decidedBy: adminUser.id,
      decidedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    },
  });

  // Priya rejected — insufficient alignment after interview
  await prisma.decision.create({
    data: {
      applicationId: app11.id,
      decision: DecisionType.REJECT,
      reason: 'While technically competent, the candidate did not demonstrate sufficient alignment with our inclusive curriculum design methodology. Communication approach may not suit remote collaborative environment.',
      decidedBy: adminUser.id,
      decidedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
  });
  console.log(`✓ Created 4 fictional decision records\n`);

  // Create Audit Logs (can link to Person, Application, or both)
  // Action strings and details match the actual audit functions in lib/audit.ts
  // Temporal ordering follows the logical pipeline flow:
  //   APPLICATION → GC assessment → GC stage → SC stage → SC assessment →
  //   INTERVIEW stage → scheduled → completed → decision → status change →
  //   AGREEMENT stage (auto on accept) → SIGNED (agreement webhook)
  console.log('Creating fictional audit logs...');
  await prisma.auditLog.createMany({
    data: [
      // ── App1: Robert — APPLICATION, ACTIVE (just applied) ──
      {
        personId: person1.id,
        applicationId: app1.id,
        action: 'Application submitted for Compliance Specialist',
        actionType: ActionType.CREATE,
        details: { position: 'Compliance Specialist', source: 'tally_webhook' },
        createdAt: app1.createdAt,
      },

      // ── App6: Maria's 2nd application — APPLICATION, ACTIVE ──
      {
        personId: person2.id,
        applicationId: app6.id,
        action: 'Application submitted for Content Writer',
        actionType: ActionType.CREATE,
        details: { position: 'Content Writer', source: 'tally_webhook' },
        createdAt: app6.createdAt,
      },

      // ── App2: Maria — SPECIALIZED_COMPETENCIES, ACTIVE ──
      // Person had already passed GC, so auto-advanced past APPLICATION
      {
        personId: person2.id,
        applicationId: app2.id,
        action: 'Application submitted for Instructional Designer',
        actionType: ActionType.CREATE,
        details: { position: 'Instructional Designer', source: 'tally_webhook' },
        createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person2.id,
        applicationId: app2.id,
        userId: adminUser.id,
        action: 'Stage changed from APPLICATION to SPECIALIZED_COMPETENCIES',
        actionType: ActionType.STAGE_CHANGE,
        details: { fromStage: 'APPLICATION', toStage: 'SPECIALIZED_COMPETENCIES', reason: 'Auto-advanced: person already passed GC' },
        createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person2.id,
        applicationId: app2.id,
        action: 'SPECIALIZED_COMPETENCIES assessment completed',
        actionType: ActionType.UPDATE,
        details: { assessmentType: 'SPECIALIZED_COMPETENCIES', score: 350, passed: false },
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      },

      // ── App3: Jan — INTERVIEW, ACTIVE ──
      {
        personId: person3.id,
        applicationId: app3.id,
        action: 'Application submitted for Chief People Officer',
        actionType: ActionType.CREATE,
        details: { position: 'Chief People Officer', source: 'tally_webhook' },
        createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person3.id,
        applicationId: app3.id,
        action: 'GENERAL_COMPETENCIES assessment completed',
        actionType: ActionType.UPDATE,
        details: { assessmentType: 'GENERAL_COMPETENCIES', score: 920, passed: true },
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person3.id,
        applicationId: app3.id,
        action: 'Stage changed from APPLICATION to GENERAL_COMPETENCIES',
        actionType: ActionType.STAGE_CHANGE,
        details: { fromStage: 'APPLICATION', toStage: 'GENERAL_COMPETENCIES' },
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person3.id,
        applicationId: app3.id,
        userId: adminUser.id,
        action: 'Stage changed from GENERAL_COMPETENCIES to SPECIALIZED_COMPETENCIES',
        actionType: ActionType.STAGE_CHANGE,
        details: { fromStage: 'GENERAL_COMPETENCIES', toStage: 'SPECIALIZED_COMPETENCIES', reason: 'GC passed — advancing to SC' },
        createdAt: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person3.id,
        applicationId: app3.id,
        action: 'SPECIALIZED_COMPETENCIES assessment completed',
        actionType: ActionType.UPDATE,
        details: { assessmentType: 'SPECIALIZED_COMPETENCIES', score: 485, passed: true },
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person3.id,
        applicationId: app3.id,
        userId: adminUser.id,
        action: 'Stage changed from SPECIALIZED_COMPETENCIES to INTERVIEW',
        actionType: ActionType.STAGE_CHANGE,
        details: { fromStage: 'SPECIALIZED_COMPETENCIES', toStage: 'INTERVIEW' },
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person3.id,
        applicationId: app3.id,
        userId: hiringManager.id,
        action: 'Interview scheduled',
        actionType: ActionType.CREATE,
        details: { interviewerId: hiringManager.id, schedulingLink: hiringManager.schedulingLink },
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },

      // ── App4: Diego — AGREEMENT, ACCEPTED ──
      {
        personId: person4.id,
        applicationId: app4.id,
        action: 'Application submitted for Video Editor',
        actionType: ActionType.CREATE,
        details: { position: 'Video Editor', source: 'tally_webhook' },
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person4.id,
        applicationId: app4.id,
        action: 'GENERAL_COMPETENCIES assessment completed',
        actionType: ActionType.UPDATE,
        details: { assessmentType: 'GENERAL_COMPETENCIES', score: 885, passed: true },
        createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person4.id,
        applicationId: app4.id,
        action: 'Stage changed from APPLICATION to GENERAL_COMPETENCIES',
        actionType: ActionType.STAGE_CHANGE,
        details: { fromStage: 'APPLICATION', toStage: 'GENERAL_COMPETENCIES' },
        createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person4.id,
        applicationId: app4.id,
        userId: adminUser.id,
        action: 'Stage changed from GENERAL_COMPETENCIES to SPECIALIZED_COMPETENCIES',
        actionType: ActionType.STAGE_CHANGE,
        details: { fromStage: 'GENERAL_COMPETENCIES', toStage: 'SPECIALIZED_COMPETENCIES', reason: 'GC passed — advancing to SC' },
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person4.id,
        applicationId: app4.id,
        action: 'SPECIALIZED_COMPETENCIES assessment completed',
        actionType: ActionType.UPDATE,
        details: { assessmentType: 'SPECIALIZED_COMPETENCIES', score: 520, passed: true },
        createdAt: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person4.id,
        applicationId: app4.id,
        userId: adminUser.id,
        action: 'Stage changed from SPECIALIZED_COMPETENCIES to INTERVIEW',
        actionType: ActionType.STAGE_CHANGE,
        details: { fromStage: 'SPECIALIZED_COMPETENCIES', toStage: 'INTERVIEW' },
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person4.id,
        applicationId: app4.id,
        userId: adminUser.id,
        action: 'Interview scheduled',
        actionType: ActionType.CREATE,
        details: { interviewerId: adminUser.id, schedulingLink: adminUser.schedulingLink },
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person4.id,
        applicationId: app4.id,
        userId: adminUser.id,
        action: 'Interview marked as completed',
        actionType: ActionType.UPDATE,
        details: { interviewerId: adminUser.id },
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person4.id,
        applicationId: app4.id,
        userId: adminUser.id,
        action: 'Decision made: ACCEPT',
        actionType: ActionType.UPDATE,
        details: { decision: 'ACCEPT', reason: 'Strong technical skills, excellent cultural fit, and impressive portfolio.' },
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person4.id,
        applicationId: app4.id,
        userId: adminUser.id,
        action: 'Status changed from ACTIVE to ACCEPTED',
        actionType: ActionType.STATUS_CHANGE,
        details: { fromStatus: 'ACTIVE', toStatus: 'ACCEPTED', reason: 'Decision: ACCEPT' },
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person4.id,
        applicationId: app4.id,
        userId: adminUser.id,
        action: 'Stage changed from INTERVIEW to AGREEMENT',
        actionType: ActionType.STAGE_CHANGE,
        details: { fromStage: 'INTERVIEW', toStage: 'AGREEMENT', reason: 'Auto-advanced: Application accepted' },
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },

      // ── App5: Pedro — GENERAL_COMPETENCIES, REJECTED ──
      {
        personId: person5.id,
        applicationId: app5.id,
        action: 'Application submitted for Software Developer',
        actionType: ActionType.CREATE,
        details: { position: 'Software Developer', source: 'tally_webhook' },
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person5.id,
        applicationId: app5.id,
        action: 'GENERAL_COMPETENCIES assessment completed',
        actionType: ActionType.UPDATE,
        details: { assessmentType: 'GENERAL_COMPETENCIES', score: 650, passed: false },
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person5.id,
        applicationId: app5.id,
        action: 'Stage changed from APPLICATION to GENERAL_COMPETENCIES',
        actionType: ActionType.STAGE_CHANGE,
        details: { fromStage: 'APPLICATION', toStage: 'GENERAL_COMPETENCIES' },
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person5.id,
        applicationId: app5.id,
        userId: adminUser.id,
        action: 'Decision made: REJECT',
        actionType: ActionType.UPDATE,
        details: { decision: 'REJECT', reason: 'Did not meet minimum threshold for general competencies assessment.' },
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person5.id,
        applicationId: app5.id,
        userId: adminUser.id,
        action: 'Status changed from ACTIVE to REJECTED',
        actionType: ActionType.STATUS_CHANGE,
        details: { fromStatus: 'ACTIVE', toStatus: 'REJECTED', reason: 'Decision: REJECT' },
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },

      // ── App7: Sarah — GENERAL_COMPETENCIES, ACTIVE (GC failed, awaiting decision) ──
      {
        personId: person6.id,
        applicationId: app7.id,
        action: 'Application submitted for UX Designer',
        actionType: ActionType.CREATE,
        details: { position: 'UX Designer', source: 'tally_webhook' },
        createdAt: app7.createdAt,
      },
      {
        personId: person6.id,
        applicationId: app7.id,
        action: 'GENERAL_COMPETENCIES assessment completed',
        actionType: ActionType.UPDATE,
        details: { assessmentType: 'GENERAL_COMPETENCIES', score: 720, passed: false },
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person6.id,
        applicationId: app7.id,
        action: 'Stage changed from APPLICATION to GENERAL_COMPETENCIES',
        actionType: ActionType.STAGE_CHANGE,
        details: { fromStage: 'APPLICATION', toStage: 'GENERAL_COMPETENCIES' },
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },

      // ── App8: Amara — SIGNED, ACCEPTED (full pipeline) ──
      {
        personId: person7.id,
        applicationId: app8.id,
        action: 'Application submitted for Course Facilitator',
        actionType: ActionType.CREATE,
        details: { position: 'Course Facilitator', source: 'tally_webhook' },
        createdAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person7.id,
        applicationId: app8.id,
        action: 'GENERAL_COMPETENCIES assessment completed',
        actionType: ActionType.UPDATE,
        details: { assessmentType: 'GENERAL_COMPETENCIES', score: 910, passed: true },
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person7.id,
        applicationId: app8.id,
        action: 'Stage changed from APPLICATION to GENERAL_COMPETENCIES',
        actionType: ActionType.STAGE_CHANGE,
        details: { fromStage: 'APPLICATION', toStage: 'GENERAL_COMPETENCIES' },
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person7.id,
        applicationId: app8.id,
        userId: adminUser.id,
        action: 'Stage changed from GENERAL_COMPETENCIES to SPECIALIZED_COMPETENCIES',
        actionType: ActionType.STAGE_CHANGE,
        details: { fromStage: 'GENERAL_COMPETENCIES', toStage: 'SPECIALIZED_COMPETENCIES', reason: 'GC passed — advancing to SC' },
        createdAt: new Date(Date.now() - 44 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person7.id,
        applicationId: app8.id,
        action: 'SPECIALIZED_COMPETENCIES assessment completed',
        actionType: ActionType.UPDATE,
        details: { assessmentType: 'SPECIALIZED_COMPETENCIES', score: 540, passed: true },
        createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person7.id,
        applicationId: app8.id,
        userId: adminUser.id,
        action: 'Stage changed from SPECIALIZED_COMPETENCIES to INTERVIEW',
        actionType: ActionType.STAGE_CHANGE,
        details: { fromStage: 'SPECIALIZED_COMPETENCIES', toStage: 'INTERVIEW' },
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person7.id,
        applicationId: app8.id,
        userId: adminUser.id,
        action: 'Interview scheduled',
        actionType: ActionType.CREATE,
        details: { interviewerId: adminUser.id, schedulingLink: adminUser.schedulingLink },
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person7.id,
        applicationId: app8.id,
        userId: adminUser.id,
        action: 'Interview marked as completed',
        actionType: ActionType.UPDATE,
        details: { interviewerId: adminUser.id },
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person7.id,
        applicationId: app8.id,
        userId: adminUser.id,
        action: 'Decision made: ACCEPT',
        actionType: ActionType.UPDATE,
        details: { decision: 'ACCEPT', reason: 'Exceptional candidate with strong facilitation background.' },
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person7.id,
        applicationId: app8.id,
        userId: adminUser.id,
        action: 'Status changed from ACTIVE to ACCEPTED',
        actionType: ActionType.STATUS_CHANGE,
        details: { fromStatus: 'ACTIVE', toStatus: 'ACCEPTED', reason: 'Decision: ACCEPT' },
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person7.id,
        applicationId: app8.id,
        userId: adminUser.id,
        action: 'Stage changed from INTERVIEW to AGREEMENT',
        actionType: ActionType.STAGE_CHANGE,
        details: { fromStage: 'INTERVIEW', toStage: 'AGREEMENT', reason: 'Auto-advanced: Application accepted' },
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person7.id,
        applicationId: app8.id,
        action: 'Stage changed from AGREEMENT to SIGNED',
        actionType: ActionType.STAGE_CHANGE,
        details: { fromStage: 'AGREEMENT', toStage: 'SIGNED', reason: 'Agreement signed via Tally webhook' },
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },

      // ── App9: Fatou — INTERVIEW, ACTIVE (interview completed, awaiting decision) ──
      {
        personId: person8.id,
        applicationId: app9.id,
        action: 'Application submitted for Programme Coordinator',
        actionType: ActionType.CREATE,
        details: { position: 'Programme Coordinator', source: 'tally_webhook' },
        createdAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person8.id,
        applicationId: app9.id,
        action: 'GENERAL_COMPETENCIES assessment completed',
        actionType: ActionType.UPDATE,
        details: { assessmentType: 'GENERAL_COMPETENCIES', score: 870, passed: true },
        createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person8.id,
        applicationId: app9.id,
        action: 'Stage changed from APPLICATION to GENERAL_COMPETENCIES',
        actionType: ActionType.STAGE_CHANGE,
        details: { fromStage: 'APPLICATION', toStage: 'GENERAL_COMPETENCIES' },
        createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person8.id,
        applicationId: app9.id,
        userId: adminUser.id,
        action: 'Stage changed from GENERAL_COMPETENCIES to SPECIALIZED_COMPETENCIES',
        actionType: ActionType.STAGE_CHANGE,
        details: { fromStage: 'GENERAL_COMPETENCIES', toStage: 'SPECIALIZED_COMPETENCIES', reason: 'GC passed — advancing to SC' },
        createdAt: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person8.id,
        applicationId: app9.id,
        action: 'SPECIALIZED_COMPETENCIES assessment completed',
        actionType: ActionType.UPDATE,
        details: { assessmentType: 'SPECIALIZED_COMPETENCIES', score: 450, passed: true },
        createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person8.id,
        applicationId: app9.id,
        userId: adminUser.id,
        action: 'Stage changed from SPECIALIZED_COMPETENCIES to INTERVIEW',
        actionType: ActionType.STAGE_CHANGE,
        details: { fromStage: 'SPECIALIZED_COMPETENCIES', toStage: 'INTERVIEW' },
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person8.id,
        applicationId: app9.id,
        userId: hiringManager.id,
        action: 'Interview scheduled',
        actionType: ActionType.CREATE,
        details: { interviewerId: hiringManager.id, schedulingLink: hiringManager.schedulingLink },
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person8.id,
        applicationId: app9.id,
        userId: hiringManager.id,
        action: 'Interview marked as completed',
        actionType: ActionType.UPDATE,
        details: { interviewerId: hiringManager.id },
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },

      // ── App10: Kenji — SPECIALIZED_COMPETENCIES, ACTIVE (SC passed, ready to advance) ──
      {
        personId: person9.id,
        applicationId: app10.id,
        action: 'Application submitted for Data Analyst',
        actionType: ActionType.CREATE,
        details: { position: 'Data Analyst', source: 'tally_webhook' },
        createdAt: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person9.id,
        applicationId: app10.id,
        action: 'GENERAL_COMPETENCIES assessment completed',
        actionType: ActionType.UPDATE,
        details: { assessmentType: 'GENERAL_COMPETENCIES', score: 880, passed: true },
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person9.id,
        applicationId: app10.id,
        action: 'Stage changed from APPLICATION to GENERAL_COMPETENCIES',
        actionType: ActionType.STAGE_CHANGE,
        details: { fromStage: 'APPLICATION', toStage: 'GENERAL_COMPETENCIES' },
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person9.id,
        applicationId: app10.id,
        userId: adminUser.id,
        action: 'Stage changed from GENERAL_COMPETENCIES to SPECIALIZED_COMPETENCIES',
        actionType: ActionType.STAGE_CHANGE,
        details: { fromStage: 'GENERAL_COMPETENCIES', toStage: 'SPECIALIZED_COMPETENCIES', reason: 'GC passed — advancing to SC' },
        createdAt: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person9.id,
        applicationId: app10.id,
        action: 'SPECIALIZED_COMPETENCIES assessment completed',
        actionType: ActionType.UPDATE,
        details: { assessmentType: 'SPECIALIZED_COMPETENCIES', score: 470, passed: true },
        createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      },

      // ── App11: Priya — INTERVIEW, REJECTED (rejected post-interview) ──
      {
        personId: person10.id,
        applicationId: app11.id,
        action: 'Application submitted for Curriculum Developer',
        actionType: ActionType.CREATE,
        details: { position: 'Curriculum Developer', source: 'tally_webhook' },
        createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person10.id,
        applicationId: app11.id,
        action: 'GENERAL_COMPETENCIES assessment completed',
        actionType: ActionType.UPDATE,
        details: { assessmentType: 'GENERAL_COMPETENCIES', score: 840, passed: true },
        createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person10.id,
        applicationId: app11.id,
        action: 'Stage changed from APPLICATION to GENERAL_COMPETENCIES',
        actionType: ActionType.STAGE_CHANGE,
        details: { fromStage: 'APPLICATION', toStage: 'GENERAL_COMPETENCIES' },
        createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person10.id,
        applicationId: app11.id,
        userId: adminUser.id,
        action: 'Stage changed from GENERAL_COMPETENCIES to SPECIALIZED_COMPETENCIES',
        actionType: ActionType.STAGE_CHANGE,
        details: { fromStage: 'GENERAL_COMPETENCIES', toStage: 'SPECIALIZED_COMPETENCIES', reason: 'GC passed — advancing to SC' },
        createdAt: new Date(Date.now() - 34 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person10.id,
        applicationId: app11.id,
        action: 'SPECIALIZED_COMPETENCIES assessment completed',
        actionType: ActionType.UPDATE,
        details: { assessmentType: 'SPECIALIZED_COMPETENCIES', score: 420, passed: true },
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person10.id,
        applicationId: app11.id,
        userId: adminUser.id,
        action: 'Stage changed from SPECIALIZED_COMPETENCIES to INTERVIEW',
        actionType: ActionType.STAGE_CHANGE,
        details: { fromStage: 'SPECIALIZED_COMPETENCIES', toStage: 'INTERVIEW' },
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person10.id,
        applicationId: app11.id,
        userId: adminUser.id,
        action: 'Interview scheduled',
        actionType: ActionType.CREATE,
        details: { interviewerId: adminUser.id, schedulingLink: adminUser.schedulingLink },
        createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person10.id,
        applicationId: app11.id,
        userId: adminUser.id,
        action: 'Interview marked as completed',
        actionType: ActionType.UPDATE,
        details: { interviewerId: adminUser.id },
        createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person10.id,
        applicationId: app11.id,
        userId: adminUser.id,
        action: 'Decision made: REJECT',
        actionType: ActionType.UPDATE,
        details: { decision: 'REJECT', reason: 'Insufficient alignment with inclusive curriculum design methodology.' },
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person10.id,
        applicationId: app11.id,
        userId: adminUser.id,
        action: 'Status changed from ACTIVE to REJECTED',
        actionType: ActionType.STATUS_CHANGE,
        details: { fromStatus: 'ACTIVE', toStatus: 'REJECTED', reason: 'Decision: REJECT' },
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
    ],
  });
  console.log(`✓ Created 66 fictional audit logs\n`);

  // Create Email Logs (can link to Person, Application, or both)
  console.log('Creating fictional email logs...');
  await prisma.emailLog.createMany({
    data: [
      // Application confirmation
      {
        personId: person1.id,
        applicationId: app1.id,
        recipientEmail: person1.email,
        templateName: 'application/application-received',
        subject: 'Application Received - Alterna',
        status: EmailStatus.SENT,
        sentAt: app1.createdAt,
      },
      // GC invitation (person-level email, not application-specific)
      {
        personId: person1.id,
        recipientEmail: person1.email,
        templateName: 'assessment/general-competencies-invitation',
        subject: 'Complete Your Assessment - Alterna',
        status: EmailStatus.SENT,
        sentAt: new Date(app1.createdAt.getTime() + 1000), // 1 second after application
      },
      // Interview invitation
      {
        personId: person3.id,
        applicationId: app3.id,
        recipientEmail: person3.email,
        templateName: 'interview/interview-invitation',
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
        templateName: 'decision/offer-letter',
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
        templateName: 'decision/rejection',
        subject: 'Application Update - Alterna',
        status: EmailStatus.SENT,
        sentAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        sentBy: adminUser.id,
      },
      // Sarah's application confirmation
      {
        personId: person6.id,
        applicationId: app7.id,
        recipientEmail: person6.email,
        templateName: 'application/application-received',
        subject: 'Application Received - Alterna',
        status: EmailStatus.SENT,
        sentAt: app7.createdAt,
      },
      // Sarah's GC invitation
      {
        personId: person6.id,
        recipientEmail: person6.email,
        templateName: 'assessment/general-competencies-invitation',
        subject: 'Complete Your Assessment - Alterna',
        status: EmailStatus.SENT,
        sentAt: new Date(app7.createdAt.getTime() + 1000),
      },
      // Sarah's GC failed notification
      {
        personId: person6.id,
        applicationId: app7.id,
        recipientEmail: person6.email,
        templateName: 'assessment/general-competencies-failed',
        subject: 'Assessment Results - Alterna',
        status: EmailStatus.SENT,
        sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      // Amara's email trail — full pipeline
      {
        personId: person7.id,
        applicationId: app8.id,
        recipientEmail: person7.email,
        templateName: 'application/application-received',
        subject: 'Application Received - Alterna',
        status: EmailStatus.SENT,
        sentAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person7.id,
        recipientEmail: person7.email,
        templateName: 'assessment/general-competencies-invitation',
        subject: 'Complete Your Assessment - Alterna',
        status: EmailStatus.SENT,
        sentAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000 + 1000),
      },
      {
        personId: person7.id,
        applicationId: app8.id,
        recipientEmail: person7.email,
        templateName: 'assessment/specialized-competencies-invitation',
        subject: 'Specialised Assessment - Alterna',
        status: EmailStatus.SENT,
        sentAt: new Date(Date.now() - 44 * 24 * 60 * 60 * 1000),
        sentBy: adminUser.id,
      },
      {
        personId: person7.id,
        applicationId: app8.id,
        recipientEmail: person7.email,
        templateName: 'interview/interview-invitation',
        subject: 'Interview Invitation - Alterna',
        status: EmailStatus.SENT,
        sentAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        sentBy: adminUser.id,
      },
      {
        personId: person7.id,
        applicationId: app8.id,
        recipientEmail: person7.email,
        templateName: 'decision/offer-letter',
        subject: 'Offer Letter - Alterna',
        status: EmailStatus.SENT,
        sentAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        sentBy: adminUser.id,
      },

      // Maria's Instructional Designer email trail
      {
        personId: person2.id,
        applicationId: app2.id,
        recipientEmail: person2.email,
        templateName: 'application/application-received',
        subject: 'Application Received - Alterna',
        status: EmailStatus.SENT,
        sentAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person2.id,
        applicationId: app2.id,
        recipientEmail: person2.email,
        templateName: 'assessment/specialized-competencies-invitation',
        subject: 'Specialised Assessment - Alterna',
        status: EmailStatus.SENT,
        sentAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
        sentBy: adminUser.id,
      },

      // Fatou's email trail
      {
        personId: person8.id,
        applicationId: app9.id,
        recipientEmail: person8.email,
        templateName: 'application/application-received',
        subject: 'Application Received - Alterna',
        status: EmailStatus.SENT,
        sentAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person8.id,
        recipientEmail: person8.email,
        templateName: 'assessment/general-competencies-invitation',
        subject: 'Complete Your Assessment - Alterna',
        status: EmailStatus.SENT,
        sentAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000 + 1000),
      },
      {
        personId: person8.id,
        applicationId: app9.id,
        recipientEmail: person8.email,
        templateName: 'assessment/specialized-competencies-invitation',
        subject: 'Specialised Assessment - Alterna',
        status: EmailStatus.SENT,
        sentAt: new Date(Date.now() - 27 * 24 * 60 * 60 * 1000),
        sentBy: adminUser.id,
      },
      {
        personId: person8.id,
        applicationId: app9.id,
        recipientEmail: person8.email,
        templateName: 'interview/interview-invitation',
        subject: 'Interview Invitation - Alterna',
        status: EmailStatus.SENT,
        sentAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        sentBy: hiringManager.id,
      },

      // Kenji's email trail
      {
        personId: person9.id,
        applicationId: app10.id,
        recipientEmail: person9.email,
        templateName: 'application/application-received',
        subject: 'Application Received - Alterna',
        status: EmailStatus.SENT,
        sentAt: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person9.id,
        recipientEmail: person9.email,
        templateName: 'assessment/general-competencies-invitation',
        subject: 'Complete Your Assessment - Alterna',
        status: EmailStatus.SENT,
        sentAt: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000 + 1000),
      },
      {
        personId: person9.id,
        applicationId: app10.id,
        recipientEmail: person9.email,
        templateName: 'assessment/specialized-competencies-invitation',
        subject: 'Specialised Assessment - Alterna',
        status: EmailStatus.SENT,
        sentAt: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000),
        sentBy: adminUser.id,
      },

      // Priya's email trail
      {
        personId: person10.id,
        applicationId: app11.id,
        recipientEmail: person10.email,
        templateName: 'application/application-received',
        subject: 'Application Received - Alterna',
        status: EmailStatus.SENT,
        sentAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      },
      {
        personId: person10.id,
        recipientEmail: person10.email,
        templateName: 'assessment/general-competencies-invitation',
        subject: 'Complete Your Assessment - Alterna',
        status: EmailStatus.SENT,
        sentAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000 + 1000),
      },
      {
        personId: person10.id,
        applicationId: app11.id,
        recipientEmail: person10.email,
        templateName: 'assessment/specialized-competencies-invitation',
        subject: 'Specialised Assessment - Alterna',
        status: EmailStatus.SENT,
        sentAt: new Date(Date.now() - 34 * 24 * 60 * 60 * 1000),
        sentBy: adminUser.id,
      },
      {
        personId: person10.id,
        applicationId: app11.id,
        recipientEmail: person10.email,
        templateName: 'interview/interview-invitation',
        subject: 'Interview Invitation - Alterna',
        status: EmailStatus.SENT,
        sentAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
        sentBy: adminUser.id,
      },
      {
        personId: person10.id,
        applicationId: app11.id,
        recipientEmail: person10.email,
        templateName: 'decision/rejection',
        subject: 'Application Update - Alterna',
        status: EmailStatus.SENT,
        sentAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        sentBy: adminUser.id,
      },
    ],
  });
  console.log(`✓ Created 27 fictional email logs\n`);

  console.log('Database seeded successfully!\n');
  console.log('Summary:');
  console.log('  - 2 sample users (1 admin, 1 hiring manager)');
  if (realUsers.length > 0) {
    console.log(`  - ${realUsers.length} real user(s) preserved`);
  }
  console.log('  - 10 fictional persons (unique individuals)');
  console.log('  - 11 fictional application records (including 2 from same person)');
  console.log('  - 16 fictional assessment records (9 GC, 7 SC)');
  console.log('  - 5 fictional interview records');
  console.log('  - 4 fictional decision records');
  console.log('  - 66 fictional audit logs');
  console.log('  - 27 fictional email logs');
  if (!cleanMode) {
    console.log('\nUse --clean flag to delete real users in next seed.');
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
