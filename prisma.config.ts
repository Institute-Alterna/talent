/**
 * Prisma Configuration
 *
 * This file configures how Prisma connects to the database.
 * It supports environment-aware database selection:
 * - Development: Uses DATABASE_URL (dev database)
 * - Production: Uses DATABASE_URL (prod database, set in Vercel)
 *
 * The actual database URLs are stored in environment variables:
 * - DATABASE_URL: The primary connection string
 *
 * On Vercel, you'll set DATABASE_URL to point to the production database.
 * Locally, your .env file points to the development database.
 */
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Get the database URL based on environment
 *
 * In production, DATABASE_URL is required and must be set.
 * In development, we use DATABASE_URL from .env file.
 */
function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      'DATABASE_URL environment variable is not set. ' +
        'Please check your .env file or Vercel environment variables.'
    );
  }

  return url;
}

export default defineConfig({
  // Path to the Prisma schema file
  schema: 'prisma/schema.prisma',

  // Path where migrations are stored
  migrations: {
    path: 'prisma/migrations',
    // Seed command to populate database with sample data
    seed: 'npx tsx prisma/seed.ts',
  },

  // Database connection configuration
  datasource: {
    url: getDatabaseUrl(),
  },
});
