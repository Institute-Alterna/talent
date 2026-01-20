/**
 * Email Queue with Rate Limiting
 *
 * Manages email sending with rate limiting to comply with Dreamhost limits:
 * - 100 recipients per hour
 * - 1,000 recipients per day
 *
 * Uses in-memory tracking suitable for serverless environments.
 * For high-volume production use, consider Redis-based rate limiting.
 */

import { rateLimitConfig } from './config';

/**
 * Email send record for rate limiting
 */
interface SendRecord {
  timestamp: number;
  recipient: string;
}

/**
 * In-memory store for tracking sent emails
 * In production with multiple instances, use Redis
 */
const sendHistory: SendRecord[] = [];

/**
 * Pending email queue
 */
interface QueuedEmail {
  id: string;
  recipient: string;
  subject: string;
  html: string | null;
  text: string | null;
  priority: 'high' | 'normal' | 'low';
  attempts: number;
  createdAt: number;
  scheduledFor?: number;
  metadata?: Record<string, unknown>;
}

const emailQueue: QueuedEmail[] = [];

/**
 * Clean old send records
 *
 * Removes records older than 24 hours to prevent memory growth.
 */
function cleanOldRecords(): void {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  // Keep only records from the last 24 hours
  while (sendHistory.length > 0 && sendHistory[0].timestamp < oneDayAgo) {
    sendHistory.shift();
  }

  // Also clean completed queue items
  for (let i = emailQueue.length - 1; i >= 0; i--) {
    if (emailQueue[i].attempts >= rateLimitConfig.retryAttempts) {
      emailQueue.splice(i, 1);
    }
  }
}

/**
 * Get current rate limit status
 *
 * @returns Object with current counts and limits
 */
export function getRateLimitStatus(): {
  sentLastHour: number;
  sentLastDay: number;
  hourlyLimit: number;
  dailyLimit: number;
  canSend: boolean;
  nextAvailableAt: number | null;
} {
  cleanOldRecords();

  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const sentLastHour = sendHistory.filter((r) => r.timestamp > oneHourAgo).length;
  const sentLastDay = sendHistory.filter((r) => r.timestamp > oneDayAgo).length;

  const hourlyAvailable = rateLimitConfig.recipientsPerHour - sentLastHour;
  const dailyAvailable = rateLimitConfig.recipientsPerDay - sentLastDay;

  const canSend = hourlyAvailable > 0 && dailyAvailable > 0;

  // Calculate when next slot opens
  let nextAvailableAt: number | null = null;
  if (!canSend && sendHistory.length > 0) {
    if (hourlyAvailable <= 0) {
      // Find oldest record in the last hour
      const hourlyRecords = sendHistory.filter((r) => r.timestamp > oneHourAgo);
      if (hourlyRecords.length > 0) {
        nextAvailableAt = hourlyRecords[0].timestamp + 60 * 60 * 1000;
      }
    } else if (dailyAvailable <= 0) {
      // Find oldest record in the last day
      nextAvailableAt = sendHistory[0].timestamp + 24 * 60 * 60 * 1000;
    }
  }

  return {
    sentLastHour,
    sentLastDay,
    hourlyLimit: rateLimitConfig.recipientsPerHour,
    dailyLimit: rateLimitConfig.recipientsPerDay,
    canSend,
    nextAvailableAt,
  };
}

/**
 * Check if an email can be sent now
 *
 * @returns Boolean indicating if sending is allowed
 */
export function canSendNow(): boolean {
  return getRateLimitStatus().canSend;
}

/**
 * Record a sent email
 *
 * @param recipient - Email recipient address
 */
export function recordSent(recipient: string): void {
  sendHistory.push({
    timestamp: Date.now(),
    recipient,
  });
}

/**
 * Add an email to the queue
 *
 * @param email - Email to queue
 * @returns Queue entry ID
 */
export function enqueue(
  email: Omit<QueuedEmail, 'id' | 'attempts' | 'createdAt'>
): string {
  const id = `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  emailQueue.push({
    ...email,
    id,
    attempts: 0,
    createdAt: Date.now(),
  });

  // Sort by priority (high first, then by creation time)
  emailQueue.sort((a, b) => {
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return a.createdAt - b.createdAt;
  });

  return id;
}

/**
 * Get next email from queue that's ready to send
 *
 * @returns Queued email or null
 */
export function dequeue(): QueuedEmail | null {
  if (!canSendNow()) {
    return null;
  }

  const now = Date.now();

  for (let i = 0; i < emailQueue.length; i++) {
    const email = emailQueue[i];

    // Skip if scheduled for later
    if (email.scheduledFor && email.scheduledFor > now) {
      continue;
    }

    // Skip if max attempts reached
    if (email.attempts >= rateLimitConfig.retryAttempts) {
      continue;
    }

    // Remove from queue and return
    emailQueue.splice(i, 1);
    return email;
  }

  return null;
}

/**
 * Re-queue an email for retry
 *
 * @param email - Email to retry
 * @param delayMs - Delay before retry (default from config)
 */
export function requeueForRetry(
  email: QueuedEmail,
  delayMs: number = rateLimitConfig.retryDelayMs
): void {
  email.attempts++;
  email.scheduledFor = Date.now() + delayMs;

  if (email.attempts < rateLimitConfig.retryAttempts) {
    emailQueue.push(email);
    // Re-sort queue
    emailQueue.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.createdAt - b.createdAt;
    });
  }
}

/**
 * Get queue statistics
 */
export function getQueueStats(): {
  pending: number;
  byPriority: Record<string, number>;
  oldestItem: number | null;
} {
  const byPriority = { high: 0, normal: 0, low: 0 };

  for (const email of emailQueue) {
    byPriority[email.priority]++;
  }

  return {
    pending: emailQueue.length,
    byPriority,
    oldestItem: emailQueue.length > 0 ? emailQueue[0].createdAt : null,
  };
}

/**
 * Clear the queue (for testing)
 */
export function clearQueue(): void {
  emailQueue.length = 0;
}

/**
 * Clear send history (for testing)
 */
export function clearHistory(): void {
  sendHistory.length = 0;
}

/**
 * Get all queued emails (for debugging)
 */
export function getQueuedEmails(): readonly QueuedEmail[] {
  return [...emailQueue];
}

/**
 * Process the queue
 *
 * Attempts to send all pending emails that are ready.
 * Returns the number of emails processed.
 *
 * @param sendFn - Function to actually send the email
 * @returns Number of emails attempted
 */
export async function processQueue(
  sendFn: (email: QueuedEmail) => Promise<boolean>
): Promise<number> {
  let processed = 0;
  let email: QueuedEmail | null;

  while ((email = dequeue()) !== null) {
    try {
      const success = await sendFn(email);
      if (success) {
        recordSent(email.recipient);
      } else {
        requeueForRetry(email);
      }
      processed++;
    } catch (error) {
      console.error(`[EmailQueue] Failed to send email ${email.id}:`, error);
      requeueForRetry(email);
      processed++;
    }

    // Small delay between sends to be nice to SMTP server
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return processed;
}
