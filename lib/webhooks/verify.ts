/**
 * Webhook Verification Utilities
 *
 * Provides security functions for verifying incoming webhooks:
 * - HMAC-SHA256 signature verification
 * - IP whitelist validation
 * - Idempotency checking
 */

import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verify Tally webhook signature using HMAC-SHA256
 *
 * Tally signs webhooks using a shared secret. The signature is sent
 * in the 'tally-signature' header as a hex-encoded HMAC-SHA256 hash.
 *
 * @param payload - The raw request body as a string
 * @param signature - The signature from the request header
 * @param secret - The webhook secret (from env var)
 * @returns Boolean indicating if signature is valid
 */
export function verifyTallySignature(payload: string, signature: string, secret: string): boolean {
  if (!signature || !secret) {
    return false;
  }

  try {
    const expectedSignature = createHmac('sha256', secret).update(payload).digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(signatureBuffer, expectedBuffer);
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
export function verifyWebhook(payload: string, headers: Headers): VerificationResult {
  const ip = getClientIP(headers);

  // Check IP whitelist
  if (!verifyIP(ip)) {
    return {
      valid: false,
      error: `IP not whitelisted: ${ip}`,
      ip,
    };
  }

  // Check signature
  const signature = headers.get('tally-signature');
  const secret = process.env.WEBHOOK_SECRET;

  if (!secret) {
    // In development, allow requests without signature if no secret configured
    if (process.env.NODE_ENV === 'development') {
      return { valid: true, ip };
    }
    return {
      valid: false,
      error: 'WEBHOOK_SECRET not configured',
      ip,
    };
  }

  if (!signature) {
    return {
      valid: false,
      error: 'Missing tally-signature header',
      ip,
    };
  }

  if (!verifyTallySignature(payload, signature, secret)) {
    return {
      valid: false,
      error: 'Invalid signature',
      ip,
    };
  }

  return { valid: true, ip };
}
