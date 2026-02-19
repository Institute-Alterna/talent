/**
 * Email Queue Tests
 *
 * Unit tests for the email queue and rate limiting in lib/email/queue.ts
 *
 * Tests cover:
 * - Rate limit status calculation
 * - Can send checks
 * - Recording sent emails
 * - Queue operations (enqueue, dequeue, requeue)
 * - Priority sorting
 * - Queue statistics
 */

import {
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
} from '@/lib/email/queue';

describe('Email Queue', () => {
  beforeEach(() => {
    // Clean state before each test
    clearQueue();
    clearHistory();
  });

  afterEach(() => {
    // Clean up after each test
    clearQueue();
    clearHistory();
  });

  describe('getRateLimitStatus', () => {
    it('returns initial state with no sends', () => {
      const status = getRateLimitStatus();
      
      expect(status.sentLastHour).toBe(0);
      expect(status.sentLastDay).toBe(0);
      expect(status.canSend).toBe(true);
      expect(status.hourlyLimit).toBe(100);
      expect(status.dailyLimit).toBe(1000);
      expect(status.nextAvailableAt).toBeNull();
    });

    it('tracks sent emails in hourly count', () => {
      recordSent('test1@example.com');
      recordSent('test2@example.com');
      
      const status = getRateLimitStatus();
      expect(status.sentLastHour).toBe(2);
      expect(status.sentLastDay).toBe(2);
    });

    it('allows sending when under limits', () => {
      for (let i = 0; i < 50; i++) {
        recordSent(`test${i}@example.com`);
      }
      
      const status = getRateLimitStatus();
      expect(status.sentLastHour).toBe(50);
      expect(status.canSend).toBe(true);
    });

    it('blocks sending when hourly limit reached', () => {
      // Record 100 sends (hourly limit)
      for (let i = 0; i < 100; i++) {
        recordSent(`test${i}@example.com`);
      }
      
      const status = getRateLimitStatus();
      expect(status.sentLastHour).toBe(100);
      expect(status.canSend).toBe(false);
      expect(status.nextAvailableAt).not.toBeNull();
    });
  });

  describe('canSendNow', () => {
    it('returns true when no emails sent', () => {
      expect(canSendNow()).toBe(true);
    });

    it('returns true when under limits', () => {
      recordSent('test@example.com');
      expect(canSendNow()).toBe(true);
    });

    it('returns false when hourly limit reached', () => {
      for (let i = 0; i < 100; i++) {
        recordSent(`test${i}@example.com`);
      }
      expect(canSendNow()).toBe(false);
    });
  });

  describe('recordSent', () => {
    it('records email send', () => {
      recordSent('test@example.com');
      const status = getRateLimitStatus();
      expect(status.sentLastHour).toBe(1);
    });

    it('records multiple sends', () => {
      recordSent('test1@example.com');
      recordSent('test2@example.com');
      recordSent('test3@example.com');
      
      const status = getRateLimitStatus();
      expect(status.sentLastHour).toBe(3);
    });
  });

  describe('enqueue', () => {
    it('adds email to queue and returns ID', () => {
      const id = enqueue({
        recipient: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
        text: 'Test',
        priority: 'normal',
      });
      
      expect(id).toMatch(/^email-\d+-[a-z0-9]+$/);
      expect(getQueueStats().pending).toBe(1);
    });

    it('sorts queue by priority (high first)', () => {
      enqueue({
        recipient: 'low@example.com',
        subject: 'Low Priority',
        html: null,
        text: 'Low',
        priority: 'low',
      });
      
      enqueue({
        recipient: 'high@example.com',
        subject: 'High Priority',
        html: null,
        text: 'High',
        priority: 'high',
      });
      
      enqueue({
        recipient: 'normal@example.com',
        subject: 'Normal Priority',
        html: null,
        text: 'Normal',
        priority: 'normal',
      });
      
      const queued = getQueuedEmails();
      expect(queued[0].recipient).toBe('high@example.com');
      expect(queued[1].recipient).toBe('normal@example.com');
      expect(queued[2].recipient).toBe('low@example.com');
    });

    it('sets initial attempts to 0', () => {
      enqueue({
        recipient: 'test@example.com',
        subject: 'Test',
        html: null,
        text: 'Test',
        priority: 'normal',
      });
      
      const queued = getQueuedEmails();
      expect(queued[0].attempts).toBe(0);
    });

    it('preserves metadata', () => {
      enqueue({
        recipient: 'test@example.com',
        subject: 'Test',
        html: null,
        text: 'Test',
        priority: 'normal',
        metadata: { personId: 'person-123', applicationId: 'app-456' },
      });
      
      const queued = getQueuedEmails();
      expect(queued[0].metadata).toEqual({
        personId: 'person-123',
        applicationId: 'app-456',
      });
    });
  });

  describe('dequeue', () => {
    it('returns null when queue is empty', () => {
      const email = dequeue();
      expect(email).toBeNull();
    });

    it('returns null when rate limited', () => {
      // Fill up hourly limit
      for (let i = 0; i < 100; i++) {
        recordSent(`test${i}@example.com`);
      }
      
      enqueue({
        recipient: 'queued@example.com',
        subject: 'Test',
        html: null,
        text: 'Test',
        priority: 'normal',
      });
      
      const email = dequeue();
      expect(email).toBeNull();
    });

    it('returns and removes email from queue when can send', () => {
      enqueue({
        recipient: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Test',
        priority: 'normal',
      });
      
      expect(getQueueStats().pending).toBe(1);
      
      const email = dequeue();
      expect(email).not.toBeNull();
      expect(email?.recipient).toBe('test@example.com');
      expect(getQueueStats().pending).toBe(0);
    });

    it('returns highest priority email first', () => {
      enqueue({
        recipient: 'normal@example.com',
        subject: 'Normal',
        html: null,
        text: 'Normal',
        priority: 'normal',
      });
      
      enqueue({
        recipient: 'high@example.com',
        subject: 'High',
        html: null,
        text: 'High',
        priority: 'high',
      });
      
      const email = dequeue();
      expect(email?.recipient).toBe('high@example.com');
    });

    it('skips emails scheduled for later', () => {
      // Add an email scheduled for the future
      enqueue({
        recipient: 'later@example.com',
        subject: 'Later',
        html: null,
        text: 'Later',
        priority: 'high',
        scheduledFor: Date.now() + 60000, // 1 minute from now
      });
      
      enqueue({
        recipient: 'now@example.com',
        subject: 'Now',
        html: null,
        text: 'Now',
        priority: 'normal',
      });
      
      const email = dequeue();
      expect(email?.recipient).toBe('now@example.com');
    });
  });

  describe('requeueForRetry', () => {
    it('increments attempt count', () => {
      enqueue({
        recipient: 'test@example.com',
        subject: 'Test',
        html: null,
        text: 'Test',
        priority: 'normal',
      });
      
      const email = dequeue()!;
      expect(email.attempts).toBe(0);
      
      requeueForRetry(email);
      
      const queued = getQueuedEmails();
      expect(queued[0].attempts).toBe(1);
    });

    it('schedules retry for future', () => {
      enqueue({
        recipient: 'test@example.com',
        subject: 'Test',
        html: null,
        text: 'Test',
        priority: 'normal',
      });
      
      const email = dequeue()!;
      const beforeRequeue = Date.now();
      
      requeueForRetry(email, 5000); // 5 second delay
      
      const queued = getQueuedEmails();
      expect(queued[0].scheduledFor).toBeGreaterThanOrEqual(beforeRequeue + 5000);
    });

    it('does not requeue if max attempts reached', () => {
      enqueue({
        recipient: 'test@example.com',
        subject: 'Test',
        html: null,
        text: 'Test',
        priority: 'normal',
      });
      
      const email = dequeue()!;
      
      // Simulate max attempts (default is 3)
      email.attempts = 2; // After incrementing, will be 3
      requeueForRetry(email);
      
      // Should be back in queue with 3 attempts
      const queued = getQueuedEmails();
      expect(queued.length).toBe(0); // Not requeued because attempts >= 3
    });
  });

  describe('getQueueStats', () => {
    it('returns stats for empty queue', () => {
      const stats = getQueueStats();
      
      expect(stats.pending).toBe(0);
      expect(stats.byPriority).toEqual({ high: 0, normal: 0, low: 0 });
      expect(stats.oldestItem).toBeNull();
    });

    it('counts emails by priority', () => {
      enqueue({ recipient: 'a@test.com', subject: 'A', html: null, text: 'A', priority: 'high' });
      enqueue({ recipient: 'b@test.com', subject: 'B', html: null, text: 'B', priority: 'high' });
      enqueue({ recipient: 'c@test.com', subject: 'C', html: null, text: 'C', priority: 'normal' });
      enqueue({ recipient: 'd@test.com', subject: 'D', html: null, text: 'D', priority: 'low' });
      
      const stats = getQueueStats();
      
      expect(stats.pending).toBe(4);
      expect(stats.byPriority.high).toBe(2);
      expect(stats.byPriority.normal).toBe(1);
      expect(stats.byPriority.low).toBe(1);
    });

    it('reports oldest item timestamp', () => {
      const beforeEnqueue = Date.now();
      
      enqueue({ recipient: 'a@test.com', subject: 'A', html: null, text: 'A', priority: 'normal' });
      
      const stats = getQueueStats();
      
      expect(stats.oldestItem).not.toBeNull();
      expect(stats.oldestItem).toBeGreaterThanOrEqual(beforeEnqueue);
    });
  });

  describe('clearQueue', () => {
    it('removes all queued emails', () => {
      enqueue({ recipient: 'a@test.com', subject: 'A', html: null, text: 'A', priority: 'high' });
      enqueue({ recipient: 'b@test.com', subject: 'B', html: null, text: 'B', priority: 'normal' });
      
      expect(getQueueStats().pending).toBe(2);
      
      clearQueue();
      
      expect(getQueueStats().pending).toBe(0);
    });
  });

  describe('clearHistory', () => {
    it('removes all send history', () => {
      recordSent('test1@example.com');
      recordSent('test2@example.com');
      
      expect(getRateLimitStatus().sentLastHour).toBe(2);
      
      clearHistory();
      
      expect(getRateLimitStatus().sentLastHour).toBe(0);
    });
  });

  describe('getQueuedEmails', () => {
    it('returns immutable copy of queue', () => {
      enqueue({ recipient: 'test@example.com', subject: 'Test', html: null, text: 'Test', priority: 'normal' });
      
      const queued = getQueuedEmails();
      expect(queued.length).toBe(1);
      
      // Modifying returned array shouldn't affect queue
      // (This is a readonly array, so we can't push to it directly)
      expect(getQueueStats().pending).toBe(1);
    });
  });
});
