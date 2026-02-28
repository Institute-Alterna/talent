/**
 * Tests for audit log humanisation utility
 */

import { humaniseAuditAction } from '@/lib/audit-display';

describe('humaniseAuditAction', () => {
  describe('stage changes', () => {
    it('humanises stage change with details', () => {
      expect(humaniseAuditAction({
        action: 'Stage changed from INTERVIEW to AGREEMENT',
        actionType: 'STAGE_CHANGE',
        details: { fromStage: 'INTERVIEW', toStage: 'AGREEMENT' },
      })).toBe('Moved from Interview to Agreement stage');
    });

    it('humanises stage change via regex fallback', () => {
      expect(humaniseAuditAction({
        action: 'Stage changed from GENERAL_COMPETENCIES to SPECIALIZED_COMPETENCIES',
        actionType: 'STAGE_CHANGE',
        details: null,
      })).toBe('Moved from General Competencies to Specialised Competencies stage');
    });

    it('humanises APPLICATION stage in stage change', () => {
      expect(humaniseAuditAction({
        action: 'Stage changed from APPLICATION to GENERAL_COMPETENCIES',
        actionType: 'STAGE_CHANGE',
        details: { fromStage: 'APPLICATION', toStage: 'GENERAL_COMPETENCIES' },
      })).toBe('Moved from Application to General Competencies stage');
    });

    it('returns raw action for unrecognised STAGE_CHANGE format', () => {
      expect(humaniseAuditAction({
        action: 'Unknown stage action',
        actionType: 'STAGE_CHANGE',
        details: null,
      })).toBe('Unknown stage action');
    });
  });

  describe('status changes', () => {
    it('humanises status change with details', () => {
      expect(humaniseAuditAction({
        action: 'Status changed from ACTIVE to ACCEPTED',
        actionType: 'STATUS_CHANGE',
        details: { fromStatus: 'ACTIVE', toStatus: 'ACCEPTED' },
      })).toBe('Status updated from Active to Accepted');
    });

    it('humanises status change via regex fallback', () => {
      expect(humaniseAuditAction({
        action: 'Status changed from ACTIVE to REJECTED',
        actionType: 'STATUS_CHANGE',
        details: null,
      })).toBe('Status updated from Active to Rejected');
    });
  });

  describe('emails', () => {
    it('humanises offer letter email with details', () => {
      expect(humaniseAuditAction({
        action: 'Email sent: decision/offer-letter',
        actionType: 'EMAIL_SENT',
        details: { templateName: 'decision/offer-letter' },
      })).toBe('Offer letter email sent');
    });

    it('humanises GC invitation email via regex fallback', () => {
      expect(humaniseAuditAction({
        action: 'Email sent: assessment/general-competencies-invitation',
        actionType: 'EMAIL_SENT',
        details: null,
      })).toBe('General competencies invitation email sent');
    });

    it('humanises rejection email', () => {
      expect(humaniseAuditAction({
        action: 'Email sent: decision/rejection',
        actionType: 'EMAIL_SENT',
        details: { templateName: 'decision/rejection' },
      })).toBe('Rejection notification email sent');
    });

    it('humanises interview invitation email', () => {
      expect(humaniseAuditAction({
        action: 'Email sent: interview/interview-invitation',
        actionType: 'EMAIL_SENT',
        details: { templateName: 'interview/interview-invitation' },
      })).toBe('Interview invitation email sent');
    });

    it('returns raw action for unknown email template', () => {
      expect(humaniseAuditAction({
        action: 'Email sent: unknown/template',
        actionType: 'EMAIL_SENT',
        details: { templateName: 'unknown/template' },
      })).toBe('Email sent: unknown/template');
    });
  });

  describe('decisions', () => {
    it('humanises accept decision with details', () => {
      expect(humaniseAuditAction({
        action: 'Decision made: ACCEPT',
        actionType: 'UPDATE',
        details: { decision: 'ACCEPT' },
      })).toBe('Application accepted');
    });

    it('humanises reject decision via regex fallback', () => {
      expect(humaniseAuditAction({
        action: 'Decision made: REJECT',
        actionType: 'UPDATE',
        details: null,
      })).toBe('Application rejected');
    });
  });

  describe('assessments', () => {
    it('humanises assessment completed with details', () => {
      expect(humaniseAuditAction({
        action: 'SPECIALIZED_COMPETENCIES assessment completed',
        actionType: 'UPDATE',
        details: { assessmentType: 'SPECIALIZED_COMPETENCIES' },
      })).toBe('Specialised Competencies assessment completed');
    });

    it('humanises GC assessment via regex fallback', () => {
      expect(humaniseAuditAction({
        action: 'GENERAL_COMPETENCIES assessment completed',
        actionType: 'UPDATE',
        details: null,
      })).toBe('General Competencies assessment completed');
    });
  });

  describe('webhooks', () => {
    it('humanises webhook received with details', () => {
      expect(humaniseAuditAction({
        action: 'Webhook received: application',
        actionType: 'CREATE',
        details: { webhookType: 'application' },
      })).toBe('Application webhook received');
    });

    it('humanises webhook with hyphenated type', () => {
      expect(humaniseAuditAction({
        action: 'Webhook received: general-competencies',
        actionType: 'CREATE',
        details: { webhookType: 'general-competencies' },
      })).toBe('General Competencies webhook received');
    });

    it('humanises webhook via regex fallback', () => {
      expect(humaniseAuditAction({
        action: 'Webhook received: specialized-competencies',
        actionType: 'CREATE',
        details: null,
      })).toBe('Specialized Competencies webhook received');
    });
  });

  describe('record views', () => {
    it('humanises application detail view with details', () => {
      expect(humaniseAuditAction({
        action: 'Record viewed: application_detail',
        actionType: 'VIEW',
        details: { viewType: 'application_detail' },
      })).toBe('Application detail viewed');
    });

    it('humanises view via regex fallback with known type', () => {
      expect(humaniseAuditAction({
        action: 'Record viewed: person_detail',
        actionType: 'VIEW',
        details: null,
      })).toBe('Person detail viewed');
    });

    it('humanises unknown view type via regex', () => {
      expect(humaniseAuditAction({
        action: 'Record viewed: some_other_view',
        actionType: 'VIEW',
        details: null,
      })).toBe('Some Other View viewed');
    });
  });

  describe('interviews', () => {
    it('humanises interview completed', () => {
      expect(humaniseAuditAction({
        action: 'Interview marked as completed',
        actionType: 'UPDATE',
        details: null,
      })).toBe('Interview completed');
    });

    it('passes through interview scheduled', () => {
      expect(humaniseAuditAction({
        action: 'Interview scheduled',
        actionType: 'CREATE',
        details: null,
      })).toBe('Interview scheduled');
    });

    it('passes through interview rescheduled', () => {
      expect(humaniseAuditAction({
        action: 'Interview rescheduled (email resent)',
        actionType: 'UPDATE',
        details: null,
      })).toBe('Interview rescheduled (email resent)');
    });
  });

  describe('passthrough', () => {
    it('returns raw action for unrecognised patterns', () => {
      expect(humaniseAuditAction({
        action: 'Person record created',
        actionType: 'CREATE',
        details: null,
      })).toBe('Person record created');
    });

    it('returns raw action for application submitted', () => {
      expect(humaniseAuditAction({
        action: 'Application submitted for Software Developer',
        actionType: 'CREATE',
        details: null,
      })).toBe('Application submitted for Software Developer');
    });

    it('passes through deletion actions', () => {
      expect(humaniseAuditAction({
        action: 'Application deleted',
        actionType: 'DELETE',
        details: null,
      })).toBe('Application deleted');
    });
  });
});
