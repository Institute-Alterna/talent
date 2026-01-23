/**
 * Recruitment Pipeline Configuration
 *
 * Define the stages, assessment thresholds, and workflow rules
 * for your recruitment process.
 */

export const recruitment = {
  // Pipeline stages in order
  stages: [
    { id: 'APPLICATION', name: 'Application', order: 1 },
    { id: 'GENERAL_COMPETENCIES', name: 'General Competencies', order: 2 },
    { id: 'SPECIALIZED_COMPETENCIES', name: 'Specialized Competencies', order: 3 },
    { id: 'INTERVIEW', name: 'Interview', order: 4 },
    { id: 'AGREEMENT', name: 'Agreement', order: 5 },
    { id: 'SIGNED', name: 'Signed', order: 6 },
  ],

  // Minimum passing scores for assessments (with scale)
  assessmentThresholds: {
    generalCompetencies: {
      threshold: 800,
      scale: 1000,
    },
    specializedCompetencies: {
      threshold: 400,
      scale: 600,
    },
  },

  // Interview settings
  interview: {
    // Default duration shown in email templates
    duration: '25-30 minutes',

    // Days to wait before sending reminder (0 = no reminder)
    reminderDays: 3,
  },

  // Email rate limiting (Dreamhost limits)
  emailLimits: {
    recipientsPerHour: 100,
    recipientsPerDay: 1000,
    retryAttempts: 3,
    retryDelayMs: 5000,
  },

  // Available positions (customize as needed)
  positions: [
    'Software Developer',
    'Instructional Designer',
    'Course Facilitator',
    'Teaching Assistant',
    'Content Writer',
    'Graphic Designer',
    'Video Editor',
    'Project Coordinator',
  ],

  // Education levels for dropdown
  educationLevels: [
    'High School',
    'Some College',
    'Associate Degree',
    "Bachelor's Degree",
    "Master's Degree",
    'Doctorate',
    'Other',
  ],

  // Countries (add more as needed)
  countries: [
    { code: 'US', name: 'United States' },
    { code: 'CA', name: 'Canada' },
    { code: 'MX', name: 'Mexico' },
    { code: 'GT', name: 'Guatemala' },
    { code: 'SV', name: 'El Salvador' },
    { code: 'HN', name: 'Honduras' },
    { code: 'NI', name: 'Nicaragua' },
    { code: 'CR', name: 'Costa Rica' },
    { code: 'PA', name: 'Panama' },
    { code: 'CO', name: 'Colombia' },
    { code: 'VE', name: 'Venezuela' },
    { code: 'EC', name: 'Ecuador' },
    { code: 'PE', name: 'Peru' },
    { code: 'BR', name: 'Brazil' },
    { code: 'AR', name: 'Argentina' },
    { code: 'CL', name: 'Chile' },
    { code: 'ES', name: 'Spain' },
  ],

  // Operational clearance levels
  clearanceLevels: [
    { id: 'A', name: 'Level A', description: 'Basic access' },
    { id: 'B', name: 'Level B', description: 'Standard access' },
    { id: 'C', name: 'Level C', description: 'Full access' },
  ],

  // Data retention (GDPR compliance)
  dataRetention: {
    // Days to keep rejected candidate data before anonymization
    rejectedCandidateDays: 365,

    // Days to keep audit logs
    auditLogDays: 730,
  },
} as const;

export type Recruitment = typeof recruitment;
export type Stage = (typeof recruitment.stages)[number];
export type Position = (typeof recruitment.positions)[number];
export type AssessmentThreshold = {
  threshold: number;
  scale: number;
};

/**
 * Calculate percentage from score and scale
 */
export function calculatePercentage(score: number, scale: number): number {
  if (scale === 0) return 0;
  return (score / scale) * 100;
}

/**
 * Format score display with scale context
 * @param score - The raw score
 * @param scale - The maximum possible score
 * @returns Object with display value and tooltip text
 */
export function formatScoreDisplay(
  score: number | string | null | undefined,
  scale: number
): { value: string; tooltip: string } {
  if (score === null || score === undefined) {
    return { value: '—', tooltip: 'No score available' };
  }
  const numScore = typeof score === 'string' ? parseFloat(score) : score;
  if (isNaN(numScore)) {
    return { value: '—', tooltip: 'Invalid score' };
  }
  const percentage = calculatePercentage(numScore, scale);
  return {
    value: Math.round(numScore).toString(),
    tooltip: `${Math.round(numScore)} / ${scale} (${percentage.toFixed(0)}%)`,
  };
}
