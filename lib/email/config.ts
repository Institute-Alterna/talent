/**
 * Email Configuration
 *
 * Centralized configuration for the email system.
 * Reads from environment variables with sensible defaults.
 */

import { recruitment } from '@/config/recruitment';
import { branding } from '@/config/branding';

/**
 * SMTP configuration from environment
 */
export const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.dreamhost.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || '',
  },
};

/**
 * Sender configuration
 */
export const senderConfig = {
  email: process.env.SMTP_FROM_EMAIL || 'talent@alterna.dev',
  name: process.env.SMTP_FROM_NAME || `${branding.organisationName} Talent Team`,
};

/**
 * Rate limiting configuration (Dreamhost limits)
 */
export const rateLimitConfig = {
  recipientsPerHour: recruitment.emailLimits.recipientsPerHour,
  recipientsPerDay: recruitment.emailLimits.recipientsPerDay,
  retryAttempts: recruitment.emailLimits.retryAttempts,
  retryDelayMs: recruitment.emailLimits.retryDelayMs,
};

/**
 * Application URLs for email links
 */
export const appUrls = {
  baseUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  tallyGCForm: process.env.TALLY_FORM_GC_URL || 'https://tally.so/r/woqXNx',
  tallySpecializedFormBase: process.env.TALLY_FORM_SPECIALIZED_BASE_URL || 'https://tally.so/r/',
};

/**
 * Common template variables available to all templates
 */
export function getCommonVariables(): Record<string, string> {
  return {
    ORGANIZATION_NAME: branding.organisationName,
    ORGANIZATION_SHORT_NAME: branding.organisationShortName,
    PRIMARY_COLOR: branding.primaryColor,
    SECONDARY_COLOR: branding.secondaryColor,
    APP_URL: appUrls.baseUrl,
    CURRENT_YEAR: new Date().getFullYear().toString(),
    SUPPORT_EMAIL: senderConfig.email,
  };
}

/**
 * Email template names
 */
export const EMAIL_TEMPLATES = {
  APPLICATION_RECEIVED: 'application-received',
  GC_INVITATION: 'general-competencies-invitation',
  GC_PASSED: 'general-competencies-passed',
  GC_FAILED: 'general-competencies-failed',
  SC_INVITATION: 'specialized-competencies-invitation',
  SC_PASSED: 'specialized-competencies-passed',
  SC_FAILED: 'specialized-competencies-failed',
  INTERVIEW_INVITATION: 'interview-invitation',
  OFFER_LETTER: 'offer-letter',
  REJECTION: 'rejection',
  ACCOUNT_CREATED: 'account-created',
} as const;

export type EmailTemplateName = (typeof EMAIL_TEMPLATES)[keyof typeof EMAIL_TEMPLATES];

/**
 * Email template metadata (subjects and descriptions)
 */
export const EMAIL_TEMPLATE_META: Record<
  EmailTemplateName,
  { subject: string; description: string }
> = {
  [EMAIL_TEMPLATES.APPLICATION_RECEIVED]: {
    subject: 'Application Received - {{POSITION}}',
    description: 'Confirmation email sent when application is submitted',
  },
  [EMAIL_TEMPLATES.GC_INVITATION]: {
    subject: 'Complete Your Assessment - {{ORGANIZATION_SHORT_NAME}}',
    description: 'Invitation to complete general competencies assessment',
  },
  [EMAIL_TEMPLATES.GC_PASSED]: {
    subject: 'Congratulations! Next Steps for {{POSITION}}',
    description: 'Notification that general competencies assessment was passed',
  },
  [EMAIL_TEMPLATES.GC_FAILED]: {
    subject: 'Application Update - {{POSITION}}',
    description: 'Notification that general competencies assessment was not passed',
  },
  [EMAIL_TEMPLATES.SC_INVITATION]: {
    subject: 'Role-Specific Assessment - {{POSITION}}',
    description: 'Invitation to complete specialized competencies assessment',
  },
  [EMAIL_TEMPLATES.SC_PASSED]: {
    subject: 'Interview Invitation - {{POSITION}}',
    description: 'Notification that specialized assessment was passed, includes interview link',
  },
  [EMAIL_TEMPLATES.SC_FAILED]: {
    subject: 'Application Update - {{POSITION}}',
    description: 'Notification that specialized assessment was not passed',
  },
  [EMAIL_TEMPLATES.INTERVIEW_INVITATION]: {
    subject: 'Schedule Your Interview - {{POSITION}}',
    description: 'Interview scheduling invitation with calendar link',
  },
  [EMAIL_TEMPLATES.OFFER_LETTER]: {
    subject: 'Offer Letter - {{POSITION}} at {{ORGANIZATION_NAME}}',
    description: 'Job offer with agreement details',
  },
  [EMAIL_TEMPLATES.REJECTION]: {
    subject: 'Application Update - {{ORGANIZATION_NAME}}',
    description: 'Final rejection notification',
  },
  [EMAIL_TEMPLATES.ACCOUNT_CREATED]: {
    subject: 'Welcome to {{ORGANIZATION_NAME}} - Account Created',
    description: 'Onboarding email with account credentials',
  },
};
