/**
 * Specialised Competencies Service
 *
 * CRUD operations for specialised competency definitions.
 * These define the assessments that can be assigned to candidates.
 */

import { db } from '@/lib/db';
import type {
  SpecialisedCompetency,
  CreateSpecialisedCompetencyData,
  UpdateSpecialisedCompetencyData,
} from '@/types';

/**
 * List all specialised competencies
 * @param activeOnly - If true (default), only return active competencies
 */
export async function listCompetencies(activeOnly = true): Promise<SpecialisedCompetency[]> {
  return db.specialisedCompetency.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
}

/**
 * Get a specialised competency by ID
 */
export async function getCompetencyById(id: string): Promise<SpecialisedCompetency | null> {
  return db.specialisedCompetency.findUnique({
    where: { id },
  });
}

/**
 * Create a new specialised competency
 */
export async function createCompetency(
  data: CreateSpecialisedCompetencyData
): Promise<SpecialisedCompetency> {
  return db.specialisedCompetency.create({
    data: {
      name: data.name,
      category: data.category,
      tallyFormUrl: data.tallyFormUrl,
      criterion: data.criterion,
    },
  });
}

/**
 * Update a specialised competency
 */
export async function updateCompetency(
  id: string,
  data: UpdateSpecialisedCompetencyData
): Promise<SpecialisedCompetency> {
  return db.specialisedCompetency.update({
    where: { id },
    data,
  });
}

/**
 * Soft-delete a specialised competency (set isActive = false)
 */
export async function deactivateCompetency(id: string): Promise<SpecialisedCompetency> {
  return db.specialisedCompetency.update({
    where: { id },
    data: { isActive: false },
  });
}

/**
 * Reactivate a soft-deleted specialised competency
 */
export async function reactivateCompetency(id: string): Promise<SpecialisedCompetency> {
  return db.specialisedCompetency.update({
    where: { id },
    data: { isActive: true },
  });
}

/**
 * Get competencies by IDs (for bulk operations like sending invitations)
 */
export async function getCompetenciesByIds(ids: string[]): Promise<SpecialisedCompetency[]> {
  return db.specialisedCompetency.findMany({
    where: { id: { in: ids }, isActive: true },
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });
}
