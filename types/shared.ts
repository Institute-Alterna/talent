/**
 * Shared Types
 *
 * Common type aliases and generics used across the application.
 * Eliminates duplication of Decimal, ActionResult, UserReference, etc.
 */

import type { Prisma } from '@/lib/generated/prisma/client';

/**
 * Prisma Decimal alias — avoids importing Prisma in every type file
 */
export type Decimal = Prisma.Decimal;

/**
 * Result type for server actions
 */
export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Reference to a user (interviewer, decision-maker, etc.)
 */
export interface UserReference {
  id: string;
  displayName: string;
  email: string;
}

/**
 * Extended user reference for interview scheduling — includes scheduling link
 */
export interface Interviewer extends UserReference {
  schedulingLink: string | null;
}

/**
 * Abbreviated person data for list views and cards
 */
export interface PersonSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  generalCompetenciesCompleted: boolean;
  generalCompetenciesScore: Decimal | null;
}

/**
 * Common pagination metadata
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
