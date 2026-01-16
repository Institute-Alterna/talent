/**
 * Database Client
 *
 * This module provides a singleton Prisma client instance for database operations.
 * Uses the MariaDB adapter for MySQL connections (required in Prisma 7).
 *
 * Why a singleton?
 * - In development with hot reloading, each reload would create a new Prisma client
 * - This exhausts database connections quickly
 * - The singleton pattern ensures we reuse the same client across hot reloads
 *
 * Usage:
 * ```typescript
 * import { db } from '@/lib/db';
 *
 * const users = await db.user.findMany();
 * ```
 */

import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

// Parse DATABASE_URL for connection parameters
function parseDbUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '3306', 10),
    user: parsed.username,
    password: parsed.password,
    database: parsed.pathname.slice(1), // Remove leading slash
  };
}

// Declare a global variable to store the Prisma client in development
// This prevents creating multiple instances during hot reloading
declare global {
   
  var prisma: PrismaClient | undefined;
}

/**
 * Create the MariaDB adapter for Prisma
 */
function createAdapter() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const config = parseDbUrl(dbUrl);

  return new PrismaMariaDb({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    connectionLimit: 5, // Reasonable limit for shared hosting
  });
}

/**
 * Create or reuse the Prisma client
 *
 * In production: Always create a new client
 * In development: Reuse the global client to prevent connection exhaustion
 */
function createPrismaClient() {
  const adapter = createAdapter();

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const db = globalThis.prisma || createPrismaClient();

// In development, store the client globally for reuse
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = db;
}

/**
 * Disconnect from the database
 *
 * Call this during graceful shutdown or testing cleanup
 */
export async function disconnectDb(): Promise<void> {
  await db.$disconnect();
}

/**
 * Check database connectivity
 *
 * Useful for health checks and startup verification
 *
 * @returns true if connected, false otherwise
 */
export async function checkDbConnection(): Promise<boolean> {
  try {
    // Execute a simple query to check connectivity
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}
