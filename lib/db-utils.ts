/**
 * Database Utilities
 *
 * Pure utility functions for database operations.
 * These functions don't have side effects and can be easily unit tested.
 */

/**
 * Database connection parameters
 */
export interface DbConnectionParams {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

/**
 * Parse a MySQL connection URL into individual connection parameters
 *
 * @param url - MySQL connection URL (e.g., mysql://user:pass@host:3306/database)
 * @returns Object with host, port, user, password, and database properties
 * @throws Error if URL is malformed
 *
 * @example
 * parseDbUrl('mysql://admin:secret@localhost:3306/mydb')
 * // Returns: { host: 'localhost', port: 3306, user: 'admin', password: 'secret', database: 'mydb' }
 */
export function parseDbUrl(url: string): DbConnectionParams {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '3306', 10),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.slice(1), // Remove leading slash
  };
}

/**
 * Get the appropriate database URL based on environment
 *
 * @returns The database URL for the current environment
 * @throws Error if no database URL is configured
 */
export function getDatabaseUrl(): string {
  const nodeEnv = process.env.NODE_ENV;

  // Production: always use DATABASE_URL
  if (nodeEnv === 'production') {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL is required in production');
    }
    return url;
  }

  // Development/Test: prefer DEV_DATABASE_URL, fallback to DATABASE_URL
  const devUrl = process.env.DEV_DATABASE_URL || process.env.DATABASE_URL;
  if (!devUrl) {
    throw new Error('DATABASE_URL or DEV_DATABASE_URL must be set');
  }
  return devUrl;
}
