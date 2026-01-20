/**
 * Log Sanitization Utility
 *
 * Prevents log injection attacks by sanitizing user-controlled input
 * before it's included in log messages.
 *
 * Security: Log injection can allow attackers to:
 * - Insert fake log entries
 * - Corrupt log analysis tools
 * - Bypass security monitoring
 * - Exploit log parsing vulnerabilities
 */

/**
 * Sanitizes user input for safe logging.
 *
 * - Replaces newlines and carriage returns with escaped versions
 * - Removes control characters that could corrupt logs
 * - Truncates to prevent log flooding
 *
 * @param input - Any user-controlled value to be logged
 * @param maxLength - Maximum length of output (default 200)
 * @returns Sanitized string safe for logging
 *
 * @example
 * console.log(`User: ${sanitizeForLog(userId)}`);
 * console.log(`Email: ${sanitizeForLog(email)}`);
 */
export function sanitizeForLog(input: unknown, maxLength: number = 200): string {
  if (input === null || input === undefined) {
    return '[null]';
  }

  const str = String(input);

  return (
    str
      // Replace newlines and carriage returns with visible escaped versions
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n')
      // Remove control characters (ASCII 0-31 except tab, and 127-159)
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/g, '')
      // Replace tabs with spaces for consistency
      .replace(/\t/g, ' ')
      // Truncate to prevent log flooding
      .substring(0, maxLength)
  );
}
