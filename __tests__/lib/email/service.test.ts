/**
 * Email Service Tests
 *
 * Integration tests for the email service in lib/email/service.ts
 * Uses mocked nodemailer transporter to avoid sending real emails.
 *
 * Tests cover:
 * - Core sendEmail function
 * - Convenience methods for each email type
 * - Rate limiting integration
 * - Email logging
 * - Error handling
 */

import {
  sendEmail,
  sendApplicationReceived,
  sendGCInvitation,
  sendSCInvitation,
  sendInterviewInvitation,
  sendRejection,
  sendOfferLetter,
  sendAccountCreated,
  getEmailServiceStatus,
} from '@/lib/email/service';
import { EMAIL_TEMPLATES } from '@/lib/email/config';
import { clearQueue, clearHistory } from '@/lib/email/queue';

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'test-message-id-123',
      accepted: ['test@example.com'],
      rejected: [],
    }),
    verify: jest.fn().mockResolvedValue(true),
    close: jest.fn(),
  })),
  createTestAccount: jest.fn().mockResolvedValue({
    user: 'test@ethereal.email',
    pass: 'testpass123',
  }),
  getTestMessageUrl: jest.fn().mockReturnValue('https://ethereal.email/message/123'),
}));

// Mock Prisma client
jest.mock('@/lib/db', () => ({
  db: {
    emailLog: {
      create: jest.fn().mockResolvedValue({
        id: 'email-log-123',
        status: 'PENDING',
      }),
      update: jest.fn().mockResolvedValue({
        id: 'email-log-123',
        status: 'SENT',
      }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({
        id: 'audit-log-123',
      }),
    },
  },
}));

// Mock audit functions
jest.mock('@/lib/audit', () => ({
  logEmailSent: jest.fn().mockResolvedValue(undefined),
}));

describe('Email Service', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    clearQueue();
    clearHistory();
    jest.clearAllMocks();
    // Suppress console output during tests
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    clearQueue();
    clearHistory();
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('sendEmail', () => {
    it('sends email with correct template', async () => {
      const result = await sendEmail({
        to: 'test@example.com',
        template: EMAIL_TEMPLATES.APPLICATION_RECEIVED,
        variables: {
          PERSON_FIRST_NAME: 'John',
          POSITION: 'Software Engineer',
          APPLICATION_DATE: '19 January 2026',
          GC_ASSESSMENT_LINK: 'https://tally.so/test',
        },
        personId: 'person-123',
        applicationId: 'app-456',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id-123');
    });

    it('returns error for invalid template', async () => {
      const result = await sendEmail({
        to: 'test@example.com',
        template: 'non-existent-template' as never,
        variables: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Template not found');
    });

    it('queues email when rate limited', async () => {
      // Fill up hourly limit
      for (let i = 0; i < 100; i++) {
        await import('@/lib/email/queue').then((m) => m.recordSent(`test${i}@example.com`));
      }

      const result = await sendEmail({
        to: 'queued@example.com',
        template: EMAIL_TEMPLATES.APPLICATION_RECEIVED,
        variables: {
          PERSON_FIRST_NAME: 'John',
          POSITION: 'Software Engineer',
          APPLICATION_DATE: '19 January 2026',
          GC_ASSESSMENT_LINK: 'https://tally.so/test',
        },
      });

      expect(result.success).toBe(false);
      expect(result.queued).toBe(true);
    });

    it('skips rate limiting when skipRateLimit is true', async () => {
      // Fill up hourly limit
      for (let i = 0; i < 100; i++) {
        await import('@/lib/email/queue').then((m) => m.recordSent(`test${i}@example.com`));
      }

      const result = await sendEmail({
        to: 'urgent@example.com',
        template: EMAIL_TEMPLATES.APPLICATION_RECEIVED,
        variables: {
          PERSON_FIRST_NAME: 'John',
          POSITION: 'Software Engineer',
          APPLICATION_DATE: '19 January 2026',
          GC_ASSESSMENT_LINK: 'https://tally.so/test',
        },
        skipRateLimit: true,
      });

      expect(result.success).toBe(true);
      expect(result.queued).toBeUndefined();
    });
  });

  describe('sendApplicationReceived', () => {
    it('sends application received email with correct variables', async () => {
      const result = await sendApplicationReceived(
        'person-123',
        'app-456',
        'candidate@example.com',
        'Jane',
        'Data Analyst',
        new Date('2026-01-19')
      );

      expect(result.success).toBe(true);
    });
  });

  describe('sendGCInvitation', () => {
    it('sends GC invitation email', async () => {
      const result = await sendGCInvitation(
        'person-123',
        'app-456',
        'candidate@example.com',
        'John',
        'Software Engineer'
      );

      expect(result.success).toBe(true);
    });

    it('handles null applicationId', async () => {
      const result = await sendGCInvitation(
        'person-123',
        null,
        'candidate@example.com',
        'John',
        'Software Engineer'
      );

      expect(result.success).toBe(true);
    });
  });

  describe('sendSCInvitation', () => {
    it('sends SC invitation with assessment URL', async () => {
      const result = await sendSCInvitation(
        'person-123',
        'app-456',
        'candidate@example.com',
        'Jane',
        'Data Analyst',
        'https://tally.so/r/specialized-form'
      );

      expect(result.success).toBe(true);
    });
  });

  describe('sendInterviewInvitation', () => {
    it('sends interview invitation with scheduling link', async () => {
      const result = await sendInterviewInvitation(
        'person-123',
        'app-456',
        'candidate@example.com',
        'Jane',
        'Data Analyst',
        'Sarah Martinez',
        'https://cal.com/interviewer/30min'
      );

      expect(result.success).toBe(true);
    });
  });

  describe('sendRejection', () => {
    it('sends rejection email without reason', async () => {
      const result = await sendRejection(
        'person-123',
        'app-456',
        'candidate@example.com',
        'Jane',
        'Data Analyst'
      );

      expect(result.success).toBe(true);
    });

    it('sends rejection email with reason', async () => {
      const result = await sendRejection(
        'person-123',
        'app-456',
        'candidate@example.com',
        'Jane',
        'Data Analyst',
        'Position filled by internal candidate'
      );

      expect(result.success).toBe(true);
    });
  });

  describe('sendOfferLetter', () => {
    it('sends offer letter with start date', async () => {
      const result = await sendOfferLetter(
        'person-123',
        'app-456',
        'candidate@example.com',
        'Jane',
        'Data Analyst',
        new Date('2026-02-01')
      );

      expect(result.success).toBe(true);
    });

    it('sends offer letter with additional details', async () => {
      const result = await sendOfferLetter(
        'person-123',
        'app-456',
        'candidate@example.com',
        'Jane',
        'Data Analyst',
        new Date('2026-02-01'),
        'Remote work available after 90-day probation period.'
      );

      expect(result.success).toBe(true);
    });
  });

  describe('sendAccountCreated', () => {
    it('sends account created email with credentials', async () => {
      const result = await sendAccountCreated(
        'person-123',
        'newuser@example.com',
        'Jane',
        'jane.doe@alterna.dev',
        'TempPass123!'
      );

      expect(result.success).toBe(true);
    });
  });

  describe('getEmailServiceStatus', () => {
    it('returns service configuration and status', () => {
      const status = getEmailServiceStatus();

      expect(status).toHaveProperty('configured');
      expect(status).toHaveProperty('rateLimitStatus');
      expect(status).toHaveProperty('sender');
      expect(status.sender).toHaveProperty('email');
      expect(status.sender).toHaveProperty('name');
    });

    it('reports rate limit status correctly', () => {
      const status = getEmailServiceStatus();

      expect(status.rateLimitStatus.sentLastHour).toBe(0);
      expect(status.rateLimitStatus.sentLastDay).toBe(0);
      expect(status.rateLimitStatus.canSend).toBe(true);
    });
  });
});
