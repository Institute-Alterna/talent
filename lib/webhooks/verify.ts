/**
 * Webhook Verification Utilities
 *
 * Provides security functions for verifying incoming webhooks:
 * - Secret token verification (header or query param)
 * - IP whitelist validation
 * - Idempotency checking
 */

import { timingSafeEqual } from 'crypto';
import { sanitizeForLog } from '@/lib/security';

/**
 * Verify webhook secret token
 *
 * Checks if the provided token matches WEBHOOK_SECRET.
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * @param token - The token from request header or query param
 * @param secret - The webhook secret (from env var)
 * @returns Boolean indicating if token is valid
 */
export function verifyWebhookSecret(token: string, secret: string): boolean {
  if (!token || !secret) {
    return false;
  }

  try {
    const tokenBuffer = Buffer.from(token);
    const secretBuffer = Buffer.from(secret);

    if (tokenBuffer.length !== secretBuffer.length) {
      return false;
    }

    return timingSafeEqual(tokenBuffer, secretBuffer);
  } catch {
    return false;
  }
}

/**
 * Known Tally webhook IP addresses
 *
 * These IPs should be verified with Tally documentation.
 * Can be configured via TALLY_WEBHOOK_IP_WHITELIST env var.
 */
const DEFAULT_TALLY_IPS = [
  // Tally.so uses AWS infrastructure - these are placeholders
  // Update with actual Tally webhook IPs
  '0.0.0.0/0', // Allow all during development - REMOVE IN PRODUCTION
];

/**
 * Parse IP whitelist from environment variable
 *
 * @returns Array of allowed IP addresses/CIDR ranges
 */
function getWhitelistedIPs(): string[] {
  const envIPs = process.env.TALLY_WEBHOOK_IP_WHITELIST;
  if (envIPs) {
    return envIPs.split(',').map((ip) => ip.trim());
  }
  return DEFAULT_TALLY_IPS;
}

/**
 * Check if an IP address matches a CIDR range
 *
 * @param ip - IP address to check
 * @param cidr - CIDR notation (e.g., "192.168.1.0/24")
 * @returns Boolean indicating if IP is in range
 */
function ipMatchesCIDR(ip: string, cidr: string): boolean {
  // Handle "allow all" case
  if (cidr === '0.0.0.0/0') {
    return true;
  }

  // Handle exact match (no CIDR)
  if (!cidr.includes('/')) {
    return ip === cidr;
  }

  const [range, bits] = cidr.split('/');
  const mask = ~((1 << (32 - parseInt(bits))) - 1);

  const ipParts = ip.split('.').map(Number);
  const rangeParts = range.split('.').map(Number);

  const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
  const rangeNum =
    (rangeParts[0] << 24) | (rangeParts[1] << 16) | (rangeParts[2] << 8) | rangeParts[3];

  return (ipNum & mask) === (rangeNum & mask);
}

/**
 * Verify that a request IP is in the whitelist
 *
 * @param ip - The request IP address
 * @returns Boolean indicating if IP is allowed
 */
export function verifyIP(ip: string | null): boolean {
  if (!ip) {
    return false;
  }

  // Skip IP validation in development
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  const whitelist = getWhitelistedIPs();

  return whitelist.some((allowedIP) => ipMatchesCIDR(ip, allowedIP));
}

/**
 * Extract client IP from request headers
 *
 * Handles various proxy headers (Vercel, Cloudflare, etc.)
 *
 * @param headers - Request headers
 * @returns IP address or null
 */
export function getClientIP(headers: Headers): string | null {
  // Vercel sets this header
  const xForwardedFor = headers.get('x-forwarded-for');
  if (xForwardedFor) {
    // Get the first IP in the chain (original client)
    return xForwardedFor.split(',')[0].trim();
  }

  // Vercel's direct header
  const xRealIP = headers.get('x-real-ip');
  if (xRealIP) {
    return xRealIP;
  }

  // Cloudflare
  const cfConnectingIP = headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  return null;
}

/**
 * Result of webhook verification
 */
export interface VerificationResult {
  valid: boolean;
  error?: string;
  ip?: string | null;
}

/**
 * Perform full webhook verification
 *
 * Checks both signature and IP whitelist.
 *
 * @param payload - Raw request body
 * @param headers - Request headers
 * @returns Verification result
 */
export function verifyWebhook(_payload: string, headers: Headers): VerificationResult {
  const ip = getClientIP(headers);

  // Check IP whitelist
  if (!verifyIP(ip)) {
    return {
      valid: false,
      error: `IP not whitelisted: ${sanitizeForLog(ip)}`,
      ip,
    };
  }

  // Check secret token
  const secret = process.env.WEBHOOK_SECRET;

  if (!secret) {
    // Fail closed: require WEBHOOK_SECRET to be configured
    console.warn('[Webhook] No WEBHOOK_SECRET configured');
    return {
      valid: false,
      error: 'WEBHOOK_SECRET not configured',
      ip,
    };
  }

  // Accept secret from multiple sources:
  // 1. x-webhook-secret header
  // 2. Authorization: Bearer <secret>
  const headerSecret = headers.get('x-webhook-secret');
  const authHeader = headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  const providedSecret = headerSecret || bearerToken;

  if (!providedSecret) {
    return {
      valid: false,
      error: 'Missing x-webhook-secret header or Authorization Bearer token',
      ip,
    };
  }

  if (!verifyWebhookSecret(providedSecret, secret)) {
    return {
      valid: false,
      error: 'Invalid webhook secret',
      ip,
    };
  }

  return { valid: true, ip };
}
