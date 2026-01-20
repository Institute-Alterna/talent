/**
 * Email Transporter
 *
 * Creates and configures the nodemailer transporter for sending emails.
 * Uses Dreamhost SMTP by default.
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { smtpConfig, senderConfig } from './config';

/**
 * Cached transporter instance
 */
let transporter: Transporter<SMTPTransport.SentMessageInfo> | null = null;

/**
 * Get or create the nodemailer transporter
 *
 * Uses singleton pattern to reuse connection across requests.
 * In serverless environments, connections may be recycled between invocations.
 */
export function getTransporter(): Transporter<SMTPTransport.SentMessageInfo> {
  if (transporter) {
    return transporter;
  }

  // Validate required configuration
  if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
    console.warn('[Email] SMTP credentials not configured. Emails will not be sent.');
  }

  const smtpOptions: SMTPTransport.Options = {
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: {
      user: smtpConfig.auth.user,
      pass: smtpConfig.auth.pass,
    },
    // Timeouts
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 30000, // 30 seconds for sending
  };

  transporter = nodemailer.createTransport(smtpOptions);

  return transporter;
}

/**
 * Verify SMTP connection
 *
 * Tests the connection to the SMTP server.
 * Useful for health checks and debugging.
 *
 * @returns Boolean indicating if connection is successful
 */
export async function verifyConnection(): Promise<boolean> {
  try {
    const transport = getTransporter();
    await transport.verify();
    console.log('[Email] SMTP connection verified successfully');
    return true;
  } catch (error) {
    console.error('[Email] SMTP connection failed:', error);
    return false;
  }
}

/**
 * Get default mail options
 */
export function getDefaultMailOptions() {
  return {
    from: `"${senderConfig.name}" <${senderConfig.email}>`,
  };
}

/**
 * Close the transporter connection
 *
 * Call this when shutting down to clean up resources.
 */
export function closeTransporter(): void {
  if (transporter) {
    transporter.close();
    transporter = null;
  }
}

/**
 * Create a test transporter for development/testing
 *
 * Uses ethereal.email for testing without sending real emails.
 */
export async function createTestTransporter(): Promise<{
  transporter: Transporter;
  testAccount: { user: string; pass: string };
}> {
  const testAccount = await nodemailer.createTestAccount();

  const testTransporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  return { transporter: testTransporter, testAccount };
}

/**
 * Get preview URL for ethereal test emails
 */
export function getTestPreviewUrl(info: SMTPTransport.SentMessageInfo): string | null {
  if (!info.messageId) return null;
  return nodemailer.getTestMessageUrl(info) || null;
}
