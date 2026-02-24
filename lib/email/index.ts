/**
 * Email Module
 *
 * Main exports for the email system.
 */

// Configuration
export {
  smtpConfig,
  senderConfig,
  rateLimitConfig,
  appUrls,
  getCommonVariables,
  EMAIL_TEMPLATES,
  EMAIL_TEMPLATE_META,
  type EmailTemplateName,
} from './config';

// Transporter
export {
  getTransporter,
  verifyConnection,
  getDefaultMailOptions,
  closeTransporter,
  createTestTransporter,
  getTestPreviewUrl,
} from './transporter';

// Templates
export {
  loadTemplate,
  clearTemplateCache,
  replaceVariables,
  renderTemplate,
  htmlToPlainText,
  findMissingVariables,
  buildAssessmentLink,
  formatEmailDate,
  escapeHtml,
} from './templates';

// Queue
export {
  getRateLimitStatus,
  canSendNow,
  recordSent,
  enqueue,
  dequeue,
  requeueForRetry,
  getQueueStats,
  clearQueue,
  clearHistory,
  getQueuedEmails,
  processQueue,
} from './queue';

// Service (main interface)
export {
  sendEmail,
  sendApplicationReceived,
  sendGCInvitation,
  sendSCInvitation,
  sendSCInvitations,
  sendInterviewInvitation,
  sendRejection,
  sendOfferLetter,
  sendAccountCreated,
  getEmailServiceStatus,
  getEmailLogsForPerson,
  getEmailLogsForApplication,
  retryFailedEmails,
  type SendResult,
  type SendEmailOptions,
} from './service';
