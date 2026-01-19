/**
 * Person Service
 *
 * Provides CRUD operations for managing persons (candidates/applicants).
 * A Person represents a unique individual identified by email.
 * Handles database operations and business logic for persons.
 */

import { db } from '@/lib/db';
import { Prisma } from '@/lib/generated/prisma/client';
import { recruitment } from '@/config/recruitment';
import type {
  Person,
  PersonListItem,
  PersonWithApplications,
  CreatePersonData,
  UpdatePersonData,
  UpdateGeneralCompetenciesData,
  PersonStats,
  PersonFilters,
  PersonsListResponse,
} from '@/types/person';

/**
 * Get all persons with optional filtering and pagination
 *
 * @param filters - Filter options
 * @returns Paginated list of persons
 */
export async function getPersons(filters?: PersonFilters): Promise<PersonsListResponse> {
  const {
    search,
    generalCompetenciesCompleted,
    hasActiveApplications,
    page = 1,
    limit = 20,
  } = filters || {};

  const where: Prisma.PersonWhereInput = {};

  if (generalCompetenciesCompleted !== undefined) {
    where.generalCompetenciesCompleted = generalCompetenciesCompleted;
  }

  if (hasActiveApplications !== undefined) {
    if (hasActiveApplications) {
      where.applications = {
        some: { status: 'ACTIVE' },
      };
    } else {
      where.applications = {
        none: { status: 'ACTIVE' },
      };
    }
  }

  if (search) {
    where.OR = [
      { email: { contains: search } },
      { firstName: { contains: search } },
      { lastName: { contains: search } },
    ];
  }

  const [persons, total] = await Promise.all([
    db.person.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        country: true,
        generalCompetenciesCompleted: true,
        generalCompetenciesScore: true,
        createdAt: true,
        _count: {
          select: { applications: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    }),
    db.person.count({ where }),
  ]);

  return {
    persons,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get a single person by ID
 *
 * @param id - Person ID (UUID)
 * @returns Person or null if not found
 */
export async function getPersonById(id: string): Promise<Person | null> {
  const person = await db.person.findUnique({
    where: { id },
  });

  return person;
}

/**
 * Get a person by email
 *
 * @param email - Person's email address
 * @returns Person or null if not found
 */
export async function getPersonByEmail(email: string): Promise<Person | null> {
  const person = await db.person.findUnique({
    where: { email: email.toLowerCase() },
  });

  return person;
}

/**
 * Get a person with all their applications
 *
 * @param id - Person ID
 * @returns Person with applications or null if not found
 */
export async function getPersonWithApplications(id: string): Promise<PersonWithApplications | null> {
  const person = await db.person.findUnique({
    where: { id },
    include: {
      applications: {
        select: {
          id: true,
          position: true,
          currentStage: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  return person;
}

/**
 * Find or create a person by email
 *
 * This is the primary method used when processing webhook data.
 * If a person with the email exists, returns them.
 * Otherwise, creates a new person record.
 *
 * @param data - Person data from webhook
 * @returns Object containing the person and whether they were newly created
 */
export async function findOrCreatePerson(
  data: CreatePersonData
): Promise<{ person: Person; created: boolean }> {
  const normalizedEmail = data.email.toLowerCase();

  // Check if person exists
  const existing = await db.person.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    return { person: existing, created: false };
  }

  // Create new person
  const person = await db.person.create({
    data: {
      email: normalizedEmail,
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName,
      secondaryEmail: data.secondaryEmail,
      phoneNumber: data.phoneNumber,
      country: data.country,
      city: data.city,
      state: data.state,
      countryCode: data.countryCode,
      portfolioLink: data.portfolioLink,
      educationLevel: data.educationLevel,
      tallyRespondentId: data.tallyRespondentId,
    },
  });

  return { person, created: true };
}

/**
 * Create a new person
 *
 * @param data - Person creation data
 * @returns Created person
 */
export async function createPerson(data: CreatePersonData): Promise<Person> {
  const person = await db.person.create({
    data: {
      email: data.email.toLowerCase(),
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName,
      secondaryEmail: data.secondaryEmail,
      phoneNumber: data.phoneNumber,
      country: data.country,
      city: data.city,
      state: data.state,
      countryCode: data.countryCode,
      portfolioLink: data.portfolioLink,
      educationLevel: data.educationLevel,
      tallyRespondentId: data.tallyRespondentId,
    },
  });

  return person;
}

/**
 * Update a person's information
 *
 * @param id - Person ID
 * @param data - Update data
 * @returns Updated person
 */
export async function updatePerson(id: string, data: UpdatePersonData): Promise<Person> {
  const person = await db.person.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });

  return person;
}

/**
 * Update a person's general competencies assessment results
 *
 * This is called when the GC assessment webhook is received.
 * Updates the person record with their score and completion status.
 *
 * @param id - Person ID
 * @param data - GC assessment data
 * @returns Updated person
 */
export async function updateGeneralCompetencies(
  id: string,
  data: UpdateGeneralCompetenciesData
): Promise<Person> {
  const threshold = recruitment.assessmentThresholds.generalCompetencies;
  const passed = data.generalCompetenciesScore >= threshold;

  const person = await db.person.update({
    where: { id },
    data: {
      generalCompetenciesCompleted: data.generalCompetenciesCompleted,
      generalCompetenciesScore: data.generalCompetenciesScore,
      generalCompetenciesPassedAt: passed ? data.generalCompetenciesPassedAt ?? new Date() : null,
      updatedAt: new Date(),
    },
  });

  return person;
}

/**
 * Check if a person has passed general competencies
 *
 * @param id - Person ID
 * @returns Boolean indicating if they passed GC
 */
export async function hasPassedGeneralCompetencies(id: string): Promise<boolean> {
  const person = await db.person.findUnique({
    where: { id },
    select: {
      generalCompetenciesCompleted: true,
      generalCompetenciesScore: true,
    },
  });

  if (!person) return false;
  if (!person.generalCompetenciesCompleted) return false;
  if (!person.generalCompetenciesScore) return false;

  const threshold = recruitment.assessmentThresholds.generalCompetencies;
  return Number(person.generalCompetenciesScore) >= threshold;
}

/**
 * Get person statistics for dashboard
 *
 * @returns Person statistics
 */
export async function getPersonStats(): Promise<PersonStats> {
  const [total, withActiveApplications, completedGC, passedGC, hiredAsUsers] = await Promise.all([
    db.person.count(),
    db.person.count({
      where: {
        applications: {
          some: { status: 'ACTIVE' },
        },
      },
    }),
    db.person.count({
      where: { generalCompetenciesCompleted: true },
    }),
    db.person.count({
      where: {
        generalCompetenciesCompleted: true,
        generalCompetenciesPassedAt: { not: null },
      },
    }),
    db.person.count({
      where: { oktaUserId: { not: null } },
    }),
  ]);

  return {
    total,
    withActiveApplications,
    completedGeneralCompetencies: completedGC,
    passedGeneralCompetencies: passedGC,
    hiredAsUsers,
  };
}

/**
 * Delete a person and all their applications
 *
 * Note: This cascades to applications, assessments, interviews, etc.
 * Use with caution - typically you should mark applications as WITHDRAWN instead.
 *
 * @param id - Person ID
 */
export async function deletePerson(id: string): Promise<void> {
  await db.person.delete({
    where: { id },
  });
}

/**
 * Link a hired person to their Okta user account
 *
 * Called when a person is hired and their Okta account is created.
 *
 * @param personId - Person ID
 * @param oktaUserId - Okta user ID
 * @returns Updated person
 */
export async function linkPersonToOkta(personId: string, oktaUserId: string): Promise<Person> {
  const person = await db.person.update({
    where: { id: personId },
    data: {
      oktaUserId,
      updatedAt: new Date(),
    },
  });

  return person;
}

/**
 * Get all active applications for a person
 *
 * Used when GC assessment is completed to advance all their active applications.
 *
 * @param personId - Person ID
 * @returns Array of active application IDs
 */
export async function getActiveApplicationIds(personId: string): Promise<string[]> {
  const applications = await db.application.findMany({
    where: {
      personId,
      status: 'ACTIVE',
    },
    select: { id: true },
  });

  return applications.map((a) => a.id);
}

/**
 * Search for persons by name or email
 *
 * @param query - Search query
 * @param limit - Maximum results to return
 * @returns Array of matching persons
 */
export async function searchPersons(query: string, limit: number = 10): Promise<PersonListItem[]> {
  const persons = await db.person.findMany({
    where: {
      OR: [
        { email: { contains: query } },
        { firstName: { contains: query } },
        { lastName: { contains: query } },
      ],
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      country: true,
      generalCompetenciesCompleted: true,
      generalCompetenciesScore: true,
      createdAt: true,
      _count: {
        select: { applications: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return persons;
}
