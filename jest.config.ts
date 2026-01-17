/**
 * Jest Configuration
 *
 * This configures Jest for testing Next.js applications with TypeScript.
 *
 * Key concepts:
 * - testEnvironment: 'jsdom' simulates a browser environment for React components
 * - moduleNameMapper: Maps path aliases (@/) to actual paths
 * - setupFilesAfterEnv: Runs setup code after Jest is initialized
 * - transform: Tells Jest how to process TypeScript files
 *
 * Note: Integration tests that use Prisma directly are separated from unit tests.
 * Run with different commands:
 * - npm test              : Runs unit tests only (fast, no DB required)
 * - npm run test:integration : Runs integration tests (requires DB)
 * - npm run test:all      : Runs all tests
 */

import type { Config } from 'jest';
import nextJest from 'next/jest.js';

// createJestConfig is a helper that Next.js provides to make Jest work with Next.js
const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

const config: Config = {
  // Use jsdom environment to simulate browser for React components
  testEnvironment: 'jsdom',

  // Setup files to run after Jest is initialized but before tests run
  // This is where we import jest-dom matchers (like toBeInTheDocument)
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // Where to look for test files
  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|tsx|js|jsx)',
    '**/*.(test|spec).(ts|tsx|js|jsx)',
  ],

  // Files to ignore when running tests
  // Exclude integration tests by default (they require database)
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/coverage/',
    '.*\\.integration\\.test\\.(ts|tsx|js|jsx)$',
  ],

  // Module path aliases - must match tsconfig.json paths
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  // Collect coverage information
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],

  // Coverage thresholds (we'll increase these as we add more tests)
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
};

// createJestConfig handles all the Next.js specific configuration
export default createJestConfig(config);
