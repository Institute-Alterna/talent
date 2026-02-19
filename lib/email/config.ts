/**
 * Email Configuration
 *
 * Centralized configuration for the email system.
 * Reads from environment variables with sensible defaults.
 */

import { recruitment } from '@/config/recruitment';
import { branding } from '@/config/branding';
import { formatDate, formatDateTime } from '@/lib/utils';

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
  const now = new Date();
  return {
    ORGANIZATION_NAME: branding.organisationName,
    ORGANIZATION_SHORT_NAME: branding.organisationShortName,
    PRIMARY_COLOR: branding.primaryColor,
    SECONDARY_COLOR: branding.secondaryColor,
    APP_URL: appUrls.baseUrl,
    CURRENT_YEAR: now.getFullYear().toString(),
    SUPPORT_EMAIL: senderConfig.email,
    LOGO_URL: `${appUrls.baseUrl}/emails/alterna-logo-email.png`,
    SENT_DATE: formatDate(now),
    SENT_TIME: formatDateTime(now),
  };
}

/**
 * Email template names
 * Templates are organized into folders by stage
 */
export const EMAIL_TEMPLATES = {
  APPLICATION_RECEIVED: 'application/application-received',
  GC_INVITATION: 'assessment/general-competencies-invitation',
  SC_INVITATION: 'assessment/specialized-competencies-invitation',
  INTERVIEW_INVITATION: 'interview/interview-invitation',
  OFFER_LETTER: 'decision/offer-letter',
  REJECTION: 'decision/rejection',
  ACCOUNT_CREATED: 'onboarding/account-created',
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
    subject: 'Application Received for {{POSITION}}',
    description: 'Confirmation email sent when application is submitted',
  },
  [EMAIL_TEMPLATES.GC_INVITATION]: {
    subject: 'Complete Your Questionnaire at {{ORGANIZATION_SHORT_NAME}}',
    description: 'Invitation to complete general competencies questionnaire',
  },
  [EMAIL_TEMPLATES.SC_INVITATION]: {
    subject: '{{POSITION}} Role-Specific Assessment',
    description: 'Invitation to complete specialized competencies assessment',
  },
  [EMAIL_TEMPLATES.INTERVIEW_INVITATION]: {
    subject: 'Interview Invitation for {{POSITION}}',
    description: 'Interview scheduling invitation with calendar link',
  },
  [EMAIL_TEMPLATES.OFFER_LETTER]: {
    subject: 'Application Update at {{ORGANIZATION_SHORT_NAME}}',
    description: 'Job offer with agreement details',
  },
  [EMAIL_TEMPLATES.REJECTION]: {
    subject: 'Application Update at {{ORGANIZATION_SHORT_NAME}}',
    description: 'Final rejection notification',
  },
  [EMAIL_TEMPLATES.ACCOUNT_CREATED]: {
    subject: 'Welcome to {{ORGANIZATION_SHORT_NAME}}',
    description: 'Onboarding email with account credentials',
  },
};
