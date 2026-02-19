/**
 * Person Types
 *
 * Type definitions for Person (unique individuals) in the talent pipeline.
 * A Person is identified by email and can have multiple Applications.
 */

import type { Stage, Status } from '@/lib/generated/prisma/client';
import type { Decimal, PaginationMeta } from './shared';

/**
 * Person data as returned from the database
 */
export interface Person {
  id: string;
  email: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  secondaryEmail: string | null;
  phoneNumber: string | null;
  country: string | null;
  city: string | null;
  state: string | null;
  countryCode: string | null;
  portfolioLink: string | null;
  educationLevel: string | null;
  generalCompetenciesCompleted: boolean;
  generalCompetenciesScore: Decimal | null;
  generalCompetenciesPassedAt: Date | null;
  tallyRespondentId: string | null;
  oktaUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Person with applications count for list views
 */
export interface PersonListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  country: string | null;
  generalCompetenciesCompleted: boolean;
  generalCompetenciesScore: Decimal | null;
  createdAt: Date;
  _count: {
    applications: number;
  };
}

/**
 * Person with full application details
 */
export interface PersonWithApplications extends Person {
  applications: ApplicationSummary[];
}

/**
 * Summary of an application (for use in person details)
 */
export interface ApplicationSummary {
  id: string;
  position: string;
  currentStage: Stage;
  status: Status;
  createdAt: Date;
}

/**
 * Data for creating a new person from Tally webhook
 */
export interface CreatePersonData {
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  secondaryEmail?: string;
  phoneNumber?: string;
  country?: string;
  city?: string;
  state?: string;
  countryCode?: string;
  portfolioLink?: string;
  educationLevel?: string;
  tallyRespondentId?: string;
}

/**
 * Data for updating a person record
 */
export interface UpdatePersonData {
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  secondaryEmail?: string | null;
  phoneNumber?: string | null;
  country?: string | null;
  city?: string | null;
  state?: string | null;
  countryCode?: string | null;
  portfolioLink?: string | null;
  educationLevel?: string | null;
}

/**
 * Data for updating general competencies assessment results
 */
export interface UpdateGeneralCompetenciesData {
  generalCompetenciesCompleted: boolean;
  generalCompetenciesScore: number;
  generalCompetenciesPassedAt?: Date;
}

/**
 * Person statistics for dashboard
 */
export interface PersonStats {
  total: number;
  withActiveApplications: number;
  completedGeneralCompetencies: number;
  passedGeneralCompetencies: number;
  hiredAsUsers: number;
}

/**
 * Filter options for listing persons
 */
export interface PersonFilters {
  search?: string;
  generalCompetenciesCompleted?: boolean;
  hasActiveApplications?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Paginated response for persons list
 */
export interface PersonsListResponse extends PaginationMeta {
  persons: PersonListItem[];
}
