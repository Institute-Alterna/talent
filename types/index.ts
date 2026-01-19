/**
 * Type Definitions Index
 *
 * Central export for all TypeScript types used throughout the application.
 * Import types from here: import { Person, Application, User } from '@/types';
 */

// Re-export all types from individual files
export * from './person';
export * from './application';
export * from './user';

// Re-export commonly used Prisma enums for convenience
export type {
  Stage,
  Status,
  AssessmentType,
  InterviewOutcome,
  DecisionType,
  ActionType,
  EmailStatus,
  Clearance,
  OktaStatus,
} from '@/lib/generated/prisma/client';
