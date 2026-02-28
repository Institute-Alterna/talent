/**
 * Audit Log Display Utilities
 *
 * Transforms raw audit log action text into human-readable descriptions.
 * Works as a UI-layer transformation — stored data is never modified.
 * Humanises both new and historical log entries.
 */

import { recruitment } from '@/config/recruitment';

/**
 * Minimal audit log shape required for humanisation
 */
interface AuditLogInput {
  action: string;
  actionType: string;
  details?: Record<string, unknown> | null;
}

/**
 * Map of email template paths to human-readable names
 */
const EMAIL_TEMPLATE_NAMES: Record<string, string> = {
  'application/application-received': 'Application received confirmation',
  'assessment/general-competencies-invitation': 'General competencies invitation',
  'assessment/specialized-competencies-invitation': 'Specialised competencies invitation',
  'interview/interview-invitation': 'Interview invitation',
  'decision/offer-letter': 'Offer letter',
  'decision/rejection': 'Rejection notification',
  'onboarding/account-created': 'Account created',
};

/**
 * Map of view types to human-readable names
 */
const VIEW_TYPE_NAMES: Record<string, string> = {
  application_detail: 'Application detail',
  person_detail: 'Person detail',
  candidate_profile: 'Candidate profile',
};

/**
 * Get a human-readable stage name from a raw stage enum value.
 * Looks up from recruitment config first, falls back to title-casing.
 */
function stageName(raw: string): string {
  if (raw === 'APPLICATION') return 'Application';
  const stage = recruitment.stages.find(s => s.id === raw);
  if (stage) return stage.name;
  // Fallback: title-case the enum (e.g. GENERAL_COMPETENCIES -> General Competencies)
  return raw
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Get a human-readable status name from a raw status enum value.
 */
function statusName(raw: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'Active',
    ACCEPTED: 'Accepted',
    REJECTED: 'Rejected',
  };
  return map[raw] || raw.charAt(0) + raw.slice(1).toLowerCase();
}

/**
 * Get a human-readable decision name.
 */
function decisionName(raw: string): string {
  const map: Record<string, string> = {
    ACCEPT: 'accepted',
    REJECT: 'rejected',
  };
  return map[raw] || raw.toLowerCase();
}

/**
 * Humanise an audit log entry's action text.
 *
 * Uses the structured `details` field when available for accurate
 * humanisation. Falls back to regex parsing of the raw `action` string
 * for historical entries missing `details`.
 *
 * @param log - Audit log entry with action, actionType, and optional details
 * @returns Human-readable action text
 */
export function humaniseAuditAction(log: AuditLogInput): string {
  const { action, actionType, details } = log;

  // --- Stage changes ---
  if (actionType === 'STAGE_CHANGE') {
    const from = details?.fromStage as string | undefined;
    const to = details?.toStage as string | undefined;
    if (from && to) {
      return `Moved from ${stageName(from)} to ${stageName(to)} stage`;
    }
    // Regex fallback for logs without details
    const stageMatch = action.match(/Stage changed from (\S+) to (\S+)/);
    if (stageMatch) {
      return `Moved from ${stageName(stageMatch[1])} to ${stageName(stageMatch[2])} stage`;
    }
    return action;
  }

  // --- Status changes ---
  if (actionType === 'STATUS_CHANGE') {
    const from = details?.fromStatus as string | undefined;
    const to = details?.toStatus as string | undefined;
    if (from && to) {
      return `Status updated from ${statusName(from)} to ${statusName(to)}`;
    }
    const statusMatch = action.match(/Status changed from (\S+) to (\S+)/);
    if (statusMatch) {
      return `Status updated from ${statusName(statusMatch[1])} to ${statusName(statusMatch[2])}`;
    }
    return action;
  }

  // --- Emails ---
  if (actionType === 'EMAIL_SENT') {
    const template = (details?.templateName as string) || '';
    if (template && EMAIL_TEMPLATE_NAMES[template]) {
      return `${EMAIL_TEMPLATE_NAMES[template]} email sent`;
    }
    const emailMatch = action.match(/Email sent: (.+)/);
    if (emailMatch) {
      const templatePath = emailMatch[1].trim();
      if (EMAIL_TEMPLATE_NAMES[templatePath]) {
        return `${EMAIL_TEMPLATE_NAMES[templatePath]} email sent`;
      }
    }
    return action;
  }

  // --- Decisions ---
  if (action.startsWith('Decision made:')) {
    const decision = (details?.decision as string) || '';
    if (decision) {
      return `Application ${decisionName(decision)}`;
    }
    const decisionMatch = action.match(/Decision made: (\S+)/);
    if (decisionMatch) {
      return `Application ${decisionName(decisionMatch[1])}`;
    }
    return action;
  }

  // --- Assessments ---
  if (action.includes('assessment completed')) {
    const type = (details?.assessmentType as string) || '';
    if (type) {
      return `${stageName(type)} assessment completed`;
    }
    const assessmentMatch = action.match(/^(\S+)\s+assessment completed/);
    if (assessmentMatch) {
      return `${stageName(assessmentMatch[1])} assessment completed`;
    }
    return action;
  }

  // --- Webhooks ---
  if (action.startsWith('Webhook received:')) {
    const webhookType = (details?.webhookType as string) || '';
    if (webhookType) {
      const humanType = webhookType
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      return `${humanType} webhook received`;
    }
    const webhookMatch = action.match(/Webhook received: (.+)/);
    if (webhookMatch) {
      const humanType = webhookMatch[1]
        .trim()
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      return `${humanType} webhook received`;
    }
    return action;
  }

  // --- Record views ---
  if (action.startsWith('Record viewed:')) {
    const viewType = (details?.viewType as string) || '';
    if (viewType && VIEW_TYPE_NAMES[viewType]) {
      return `${VIEW_TYPE_NAMES[viewType]} viewed`;
    }
    const viewMatch = action.match(/Record viewed: (.+)/);
    if (viewMatch) {
      const viewKey = viewMatch[1].trim();
      if (VIEW_TYPE_NAMES[viewKey]) {
        return `${VIEW_TYPE_NAMES[viewKey]} viewed`;
      }
      // Fallback: humanise the view type key
      return `${viewKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} viewed`;
    }
    return action;
  }

  // --- Interview completed ---
  if (action === 'Interview marked as completed') {
    return 'Interview completed';
  }

  // --- Interview scheduled ---
  if (action === 'Interview scheduled') {
    return 'Interview scheduled';
  }

  // --- Interview rescheduled ---
  if (action.startsWith('Interview rescheduled') || action.startsWith('Interview reassigned')) {
    return action;
  }

  // --- Deletion ---
  if (action.endsWith(' deleted')) {
    return action;
  }

  // --- Passthrough: return raw action as-is ---
  return action;
}
