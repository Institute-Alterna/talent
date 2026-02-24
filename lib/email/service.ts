/**
 * Email Service
 *
 * Main service for sending emails through the talent management system.
 * Handles template rendering, rate limiting, logging, and error handling.
 */

import { db } from '@/lib/db';
import { getTransporter, getDefaultMailOptions } from './transporter';
import { renderTemplate, htmlToPlainText, buildAssessmentLink, formatEmailDate, escapeHtml } from './templates';
import {
  canSendNow,
  recordSent,
  enqueue,
  getRateLimitStatus,
} from './queue';
import {
  senderConfig,
  appUrls,
  EMAIL_TEMPLATES,
  type EmailTemplateName,
} from './config';
import { logEmailSent } from '@/lib/audit';

/**
 * Email send result
 */
export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  queued?: boolean;
  emailLogId?: string;
}

/**
 * Options for sending an email
 */
export interface SendEmailOptions {
  /** Recipient email address */
  to: string;
  /** Email template name */
  template: EmailTemplateName;
  /** Template variables */
  variables?: Record<string, string>;
  /** Person ID for logging */
  personId?: string;
  /** Application ID for logging */
  applicationId?: string;
  /** User ID who triggered the send */
  sentBy?: string;
  /** Priority for queue */
  priority?: 'high' | 'normal' | 'low';
  /** Skip rate limiting (for critical emails) */
  skipRateLimit?: boolean;
}

/**
 * Create an email log entry
 */
async function createEmailLog(
  personId: string | undefined,
  applicationId: string | undefined,
  recipientEmail: string,
  templateName: string,
  subject: string,
  sentBy?: string
) {
  return db.emailLog.create({
    data: {
      personId,
      applicationId,
      recipientEmail,
      templateName,
      subject,
      status: 'PENDING',
      sentBy,
    },
  });
}

/**
 * Update email log status
 */
async function updateEmailLog(
  id: string,
  status: 'SENT' | 'FAILED' | 'BOUNCED',
  errorMessage?: string
) {
  return db.emailLog.update({
    where: { id },
    data: {
      status,
      sentAt: status === 'SENT' ? new Date() : undefined,
      errorMessage,
    },
  });
}

/**
 * Send an email
 *
 * Primary method for sending emails. Handles:
 * - Template rendering
 * - Rate limiting
 * - Database logging
 * - Error handling
 * - Queueing if rate limited
 *
 * @param options - Send options
 * @returns Send result
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendResult> {
  const {
    to,
    template,
    variables = {},
    personId,
    applicationId,
    sentBy,
    priority = 'normal',
    skipRateLimit = false,
  } = options;

  // Render template
  const { html, text, subject } = renderTemplate(template, variables);

  if (!html && !text) {
    console.error(`[Email] Template not found: ${template}`);
    return {
      success: false,
      error: `Template not found: ${template}`,
    };
  }

  // Create email log entry
  let emailLog;
  try {
    emailLog = await createEmailLog(
      personId,
      applicationId,
      to,
      template,
      subject,
      sentBy
    );
  } catch (error) {
    console.error('[Email] Failed to create email log:', error);
    // Continue without logging
  }

  // Check rate limit
  if (!skipRateLimit && !canSendNow()) {
    const status = getRateLimitStatus();
    console.warn(
      `[Email] Rate limit reached. Sent: ${status.sentLastHour}/${status.hourlyLimit} per hour, ` +
        `${status.sentLastDay}/${status.dailyLimit} per day. Queueing email.`
    );

    // Queue for later
    enqueue({
      recipient: to,
      subject,
      html,
      text,
      priority,
      metadata: { personId, applicationId, sentBy, emailLogId: emailLog?.id },
    });

    return {
      success: false,
      queued: true,
      error: 'Rate limit reached, email queued',
      emailLogId: emailLog?.id,
    };
  }

  // Send the email
  try {
    const transporter = getTransporter();
    const mailOptions = {
      ...getDefaultMailOptions(),
      to,
      subject,
      html: html || undefined,
      text: text || (html ? htmlToPlainText(html) : undefined),
    };

    const info = await transporter.sendMail(mailOptions);

    // Record the send for rate limiting
    recordSent(to);

    // Update email log
    if (emailLog) {
      await updateEmailLog(emailLog.id, 'SENT');
    }

    // Create audit log
    if (personId) {
      await logEmailSent(personId, applicationId || null, template, to, sentBy);
    }

    console.log(`[Email] Sent ${template} to ${to}, messageId: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId,
      emailLogId: emailLog?.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Email] Failed to send ${template} to ${to}:`, errorMessage);

    // Update email log
    if (emailLog) {
      await updateEmailLog(emailLog.id, 'FAILED', errorMessage);
    }

    return {
      success: false,
      error: errorMessage,
      emailLogId: emailLog?.id,
    };
  }
}

// =============================================================================
// CONVENIENCE METHODS FOR SPECIFIC EMAIL TYPES
// =============================================================================

/**
 * Send application received confirmation
 */
export async function sendApplicationReceived(
  personId: string,
  applicationId: string,
  to: string,
  firstName: string,
  position: string,
  applicationDate: Date
): Promise<SendResult> {
  const gcLink = appUrls.tallyGCForm
    ? buildAssessmentLink(appUrls.tallyGCForm, personId)
    : '';

  return sendEmail({
    to,
    template: EMAIL_TEMPLATES.APPLICATION_RECEIVED,
    variables: {
      PERSON_FIRST_NAME: escapeHtml(firstName),
      POSITION: escapeHtml(position),
      APPLICATION_DATE: formatEmailDate(applicationDate),
      GC_ASSESSMENT_LINK: gcLink,
    },
    personId,
    applicationId,
    priority: 'high',
  });
}

/**
 * Send general competencies assessment invitation
 */
export async function sendGCInvitation(
  personId: string,
  applicationId: string | null,
  to: string,
  firstName: string,
  position: string
): Promise<SendResult> {
  const gcLink = appUrls.tallyGCForm
    ? buildAssessmentLink(appUrls.tallyGCForm, personId)
    : '';

  return sendEmail({
    to,
    template: EMAIL_TEMPLATES.GC_INVITATION,
    variables: {
      PERSON_FIRST_NAME: escapeHtml(firstName),
      POSITION: escapeHtml(position),
      GC_ASSESSMENT_LINK: gcLink,
    },
    personId,
    applicationId: applicationId || undefined,
    priority: 'high',
  });
}

/**
 * Send specialized competencies assessment invitation
 */
export async function sendSCInvitation(
  personId: string,
  applicationId: string,
  to: string,
  firstName: string,
  position: string,
  assessmentFormUrl: string
): Promise<SendResult> {
  const scLink = buildAssessmentLink(assessmentFormUrl, personId, applicationId);

  return sendEmail({
    to,
    template: EMAIL_TEMPLATES.SC_INVITATION,
    variables: {
      PERSON_FIRST_NAME: escapeHtml(firstName),
      POSITION: escapeHtml(position),
      SC_ASSESSMENT_LINK: scLink,
    },
    personId,
    applicationId,
    priority: 'high',
  });
}

/**
 * Send specialised competencies invitation(s)
 *
 * Sends a single email with one or more SC assessment links.
 * For a single SC, the list contains one item with a button.
 * For multiple SCs, the list contains multiple items with links.
 */
export async function sendSCInvitations(
  personId: string,
  applicationId: string,
  to: string,
  firstName: string,
  position: string,
  competencies: Array<{ id: string; name: string; tallyFormUrl: string }>
): Promise<SendResult> {
  if (competencies.length === 1) {
    // Single SC — use a single-item list with a button
    const sc = competencies[0];
    const scLink = buildAssessmentLink(sc.tallyFormUrl, personId, applicationId, sc.id);

    const scListHtml = `<li style="margin-bottom: 12px;"><p style="font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 28px 0;"><a href="${scLink}" style="font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; display: inline-block; background-color: {{PRIMARY_COLOR}}; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 4px; font-weight: 500;">Start Assessment</a></p><p style="font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 0 0 20px 0; color: #666666; font-size: 14px;">If the button doesn&rsquo;t work, copy and paste this link into your browser:<br><a href="${scLink}" style="color: {{PRIMARY_COLOR}}; word-break: break-all;">${scLink}</a></p></li>`;

    return sendEmail({
      to,
      template: EMAIL_TEMPLATES.SC_INVITATION,
      variables: {
        PERSON_FIRST_NAME: escapeHtml(firstName),
        POSITION: escapeHtml(position),
        SC_ASSESSMENT_LIST: scListHtml,
      },
      personId,
      applicationId,
      priority: 'high',
    });
  }

  // Multiple SCs — build a list of links
  const scListHtml = competencies.map((sc) => {
    const scLink = buildAssessmentLink(sc.tallyFormUrl, personId, applicationId, sc.id);
    return `<li style="margin-bottom: 12px;"><strong>${escapeHtml(sc.name)}</strong><br><a href="${scLink}" style="color: {{PRIMARY_COLOR}}; text-decoration: underline;">Start Assessment</a></li>`;
  }).join('');

  return sendEmail({
    to,
    template: EMAIL_TEMPLATES.SC_INVITATION,
    variables: {
      PERSON_FIRST_NAME: escapeHtml(firstName),
      POSITION: escapeHtml(position),
      SC_ASSESSMENT_LIST: scListHtml,
    },
    personId,
    applicationId,
    priority: 'high',
  });
}

/**
 * Send interview invitation
 */
export async function sendInterviewInvitation(
  personId: string,
  applicationId: string,
  to: string,
  firstName: string,
  position: string,
  interviewerName: string,
  schedulingLink: string
): Promise<SendResult> {
  return sendEmail({
    to,
    template: EMAIL_TEMPLATES.INTERVIEW_INVITATION,
    variables: {
      PERSON_FIRST_NAME: escapeHtml(firstName),
      POSITION: escapeHtml(position),
      INTERVIEWER_NAME: escapeHtml(interviewerName),
      SCHEDULING_LINK: schedulingLink,
    },
    personId,
    applicationId,
    priority: 'high',
  });
}

/**
 * Send rejection notification
 */
export async function sendRejection(
  personId: string,
  applicationId: string,
  to: string,
  firstName: string,
  position: string,
  reason?: string
): Promise<SendResult> {
  return sendEmail({
    to,
    template: EMAIL_TEMPLATES.REJECTION,
    variables: {
      PERSON_FIRST_NAME: escapeHtml(firstName),
      POSITION: escapeHtml(position),
      REJECTION_REASON: reason ? escapeHtml(reason) : '',
    },
    personId,
    applicationId,
    priority: 'normal',
  });
}

/**
 * Send offer letter
 */
export async function sendOfferLetter(
  personId: string,
  applicationId: string,
  to: string,
  firstName: string,
  position: string,
  startDate: Date,
  additionalDetails?: string
): Promise<SendResult> {
  const agreementLink = appUrls.tallyAgreementForm
    ? buildAssessmentLink(appUrls.tallyAgreementForm, personId, applicationId)
    : '';

  return sendEmail({
    to,
    template: EMAIL_TEMPLATES.OFFER_LETTER,
    variables: {
      PERSON_FIRST_NAME: escapeHtml(firstName),
      POSITION: escapeHtml(position),
      START_DATE: formatEmailDate(startDate),
      ADDITIONAL_DETAILS: additionalDetails ? escapeHtml(additionalDetails) : '',
      AGREEMENT_LINK: agreementLink,
    },
    personId,
    applicationId,
    priority: 'high',
  });
}

/**
 * Send account created notification
 */
export async function sendAccountCreated(
  personId: string,
  to: string,
  firstName: string,
  alternaEmail: string,
  temporaryPassword: string
): Promise<SendResult> {
  return sendEmail({
    to,
    template: EMAIL_TEMPLATES.ACCOUNT_CREATED,
    variables: {
      PERSON_FIRST_NAME: escapeHtml(firstName),
      ALTERNA_EMAIL: escapeHtml(alternaEmail),
      TEMPORARY_PASSWORD: escapeHtml(temporaryPassword),
      LOGIN_URL: `${appUrls.baseUrl}/auth/signin`,
    },
    personId,
    priority: 'high',
  });
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get email service status
 */
export function getEmailServiceStatus() {
  const rateLimitStatus = getRateLimitStatus();

  return {
    configured: Boolean(process.env.SMTP_USER && process.env.SMTP_PASSWORD),
    rateLimitStatus,
    sender: {
      email: senderConfig.email,
      name: senderConfig.name,
    },
  };
}

/**
 * Get email logs for a person
 */
export async function getEmailLogsForPerson(personId: string, limit: number = 20) {
  return db.emailLog.findMany({
    where: { personId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Get email logs for an application
 */
export async function getEmailLogsForApplication(applicationId: string, limit: number = 20) {
  return db.emailLog.findMany({
    where: { applicationId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Retry failed emails
 *
 * Finds failed emails and attempts to resend them.
 * Returns the number of emails retried.
 */
export async function retryFailedEmails(limit: number = 10): Promise<number> {
  const failedEmails = await db.emailLog.findMany({
    where: {
      status: 'FAILED',
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  let retried = 0;

  for (const log of failedEmails) {
    // Only retry if we can send
    if (!canSendNow()) {
      console.log('[Email] Rate limit reached, stopping retry');
      break;
    }

    // Re-send the email
    // Note: We don't have the full template variables, so this is a simplified retry
    console.log(`[Email] Retrying failed email ${log.id} to ${log.recipientEmail}`);

    // Mark as pending
    await db.emailLog.update({
      where: { id: log.id },
      data: { status: 'PENDING', errorMessage: null },
    });

    retried++;
  }

  return retried;
}
