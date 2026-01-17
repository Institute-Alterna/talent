/**
 * Jest Configuration for Integration Tests
 *
 * This configuration is specifically for tests that require database access.
 * These tests use the Prisma client to verify actual database operations.
 *
 * Run with: npm run test:integration
 *
 * Prerequisites:
 * - Development database must be running and accessible
 * - DATABASE_URL must be set in .env
 * - Prisma client must be generated (npx prisma generate)
 */

import type { Config } from 'jest';
import nextJest from 'next/jest.js';

// createJestConfig is a helper that Next.js provides
const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  // Use Node environment for database tests (not jsdom)
  testEnvironment: 'node',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // Only run integration tests
  testMatch: ['**/*.integration.test.(ts|tsx|js|jsx)'],

  // Standard ignores
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/coverage/',
  ],

  // Module path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  // Increase timeout for database operations
  testTimeout: 30000,

  // Run tests serially to avoid database conflicts
  maxWorkers: 1,

  // Force ESM for Prisma 7 compatibility
  extensionsToTreatAsEsm: ['.ts'],

  // Transform settings for ESM
  transform: {
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            syntax: 'typescript',
            tsx: true,
          },
          transform: {
            react: {
              runtime: 'automatic',
            },
          },
        },
        module: {
          type: 'es6',
        },
      },
    ],
  },

  // Collect coverage from lib files
  collectCoverageFrom: ['lib/**/*.{ts,tsx}', '!**/*.d.ts', '!**/node_modules/**'],
};

export default createJestConfig(config);
