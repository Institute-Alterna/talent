/**
 * Webhook Rate Limiter
 *
 * Provides rate limiting for webhook endpoints using a sliding window algorithm.
 * Uses in-memory storage suitable for serverless functions.
 *
 * Note: In a production environment with multiple instances, consider using
 * Redis or another distributed store for rate limiting state.
 */

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests in the current window */
  remaining: number;
  /** When the rate limit resets (Unix timestamp in seconds) */
  resetAt: number;
  /** Number of requests made in the current window */
  count: number;
}

/**
 * Stored request entry
 */
interface RequestEntry {
  timestamp: number;
}

/**
 * In-memory store for rate limiting
 * Key: identifier (IP or endpoint), Value: array of request timestamps
 */
const store = new Map<string, RequestEntry[]>();

/**
 * Default rate limit: 100 requests per minute
 */
const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 minute
};

/**
 * Clean old entries from the store
 *
 * Removes entries older than the window from all keys.
 * Should be called periodically to prevent memory leaks.
 *
 * @param windowMs - Time window in milliseconds
 */
function cleanOldEntries(windowMs: number): void {
  const cutoff = Date.now() - windowMs;

  for (const [key, entries] of store.entries()) {
    const filtered = entries.filter((e) => e.timestamp > cutoff);
    if (filtered.length === 0) {
      store.delete(key);
    } else {
      store.set(key, filtered);
    }
  }
}

/**
 * Check rate limit for an identifier
 *
 * @param identifier - Unique identifier (e.g., IP address, endpoint name)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Get existing entries and filter to current window
  const entries = store.get(identifier) || [];
  const recentEntries = entries.filter((e) => e.timestamp > windowStart);

  const count = recentEntries.length;
  const allowed = count < config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - count - (allowed ? 1 : 0));
  const resetAt = Math.ceil((windowStart + config.windowMs) / 1000);

  if (allowed) {
    // Add new entry
    recentEntries.push({ timestamp: now });
    store.set(identifier, recentEntries);
  }

  // Periodically clean old entries (1% chance per request)
  if (Math.random() < 0.01) {
    cleanOldEntries(config.windowMs);
  }

  return {
    allowed,
    remaining,
    resetAt,
    count: count + (allowed ? 1 : 0),
  };
}

/**
 * Create a rate limiter with a specific configuration
 *
 * @param config - Rate limit configuration
 * @returns Rate limit checker function
 */
export function createRateLimiter(config: RateLimitConfig) {
  return (identifier: string): RateLimitResult => {
    return checkRateLimit(identifier, config);
  };
}

/**
 * Webhook rate limiter (100 requests per minute)
 */
export const webhookRateLimiter = createRateLimiter({
  maxRequests: 100,
  windowMs: 60 * 1000,
});

/**
 * Stricter rate limiter for sensitive operations (10 requests per minute)
 */
export const strictRateLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000,
});

/**
 * Get rate limit headers for a response
 *
 * @param result - Rate limit result
 * @returns Headers object
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.count + result.remaining),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.resetAt),
  };
}

/**
 * Reset rate limit for an identifier (for testing)
 *
 * @param identifier - The identifier to reset
 */
export function resetRateLimit(identifier: string): void {
  store.delete(identifier);
}

/**
 * Clear all rate limits (for testing)
 */
export function clearAllRateLimits(): void {
  store.clear();
}
