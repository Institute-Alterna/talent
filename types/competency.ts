/**
 * Specialised Competency Types
 *
 * Type definitions for the specialised competency management system.
 */

/**
 * Specialised competency as returned from the database
 */
export interface SpecialisedCompetency {
  id: string;
  name: string;
  category: string;
  tallyFormUrl: string;
  criterion: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Data for creating a new specialised competency
 */
export interface CreateSpecialisedCompetencyData {
  name: string;
  category: string;
  tallyFormUrl: string;
  criterion: string;
}

/**
 * Data for updating a specialised competency
 */
export interface UpdateSpecialisedCompetencyData {
  name?: string;
  category?: string;
  tallyFormUrl?: string;
  criterion?: string;
  isActive?: boolean;
}

/**
 * Specialised competency for the selection explorer dialog
 */
export interface SpecialisedCompetencyOption {
  id: string;
  name: string;
  category: string;
  criterion: string;
  tallyFormUrl: string;
}
