/**
 * Competencies Service Tests
 *
 * Unit tests for lib/services/competencies.ts
 * Tests use a mocked Prisma client to avoid database dependencies.
 */

import { db } from '@/lib/db';
import {
  listCompetencies,
  getCompetencyById,
  createCompetency,
  updateCompetency,
  deactivateCompetency,
  reactivateCompetency,
  getCompetenciesByIds,
} from '@/lib/services/competencies';

// Mock the database
jest.mock('@/lib/db', () => ({
  db: {
    specialisedCompetency: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockCompetency = {
  id: 'sc-uuid-1111-2222-3333-444444444444',
  name: 'Python Proficiency',
  category: 'Technical',
  tallyFormUrl: 'https://tally.so/r/python-test',
  criterion: 'Candidate can write clean Python code with unit tests',
  isActive: true,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const mockCompetency2 = {
  id: 'sc-uuid-aaaa-bbbb-cccc-dddddddddddd',
  name: 'Written Communication',
  category: 'Communication',
  tallyFormUrl: 'https://tally.so/r/writing-test',
  criterion: 'Clear written communication demonstrated through sample task',
  isActive: true,
  createdAt: new Date('2025-01-02'),
  updatedAt: new Date('2025-01-02'),
};

describe('Competencies Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  describe('listCompetencies', () => {
    it('lists only active competencies by default', async () => {
      (db.specialisedCompetency.findMany as jest.Mock).mockResolvedValue([
        mockCompetency,
        mockCompetency2,
      ]);

      const result = await listCompetencies();

      expect(db.specialisedCompetency.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });
      expect(result).toHaveLength(2);
    });

    it('lists all competencies when activeOnly = false', async () => {
      const inactive = { ...mockCompetency, isActive: false, id: 'sc-inactive' };
      (db.specialisedCompetency.findMany as jest.Mock).mockResolvedValue([
        mockCompetency,
        inactive,
      ]);

      const result = await listCompetencies(false);

      expect(db.specialisedCompetency.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });
      expect(result).toHaveLength(2);
    });

    it('returns empty array when no competencies exist', async () => {
      (db.specialisedCompetency.findMany as jest.Mock).mockResolvedValue([]);
      const result = await listCompetencies();
      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  describe('getCompetencyById', () => {
    it('returns competency when found', async () => {
      (db.specialisedCompetency.findUnique as jest.Mock).mockResolvedValue(mockCompetency);

      const result = await getCompetencyById(mockCompetency.id);

      expect(db.specialisedCompetency.findUnique).toHaveBeenCalledWith({
        where: { id: mockCompetency.id },
      });
      expect(result).toEqual(mockCompetency);
    });

    it('returns null when competency not found', async () => {
      (db.specialisedCompetency.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getCompetencyById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  describe('createCompetency', () => {
    it('creates competency with correct data', async () => {
      (db.specialisedCompetency.create as jest.Mock).mockResolvedValue(mockCompetency);

      const input = {
        name: mockCompetency.name,
        category: mockCompetency.category,
        tallyFormUrl: mockCompetency.tallyFormUrl,
        criterion: mockCompetency.criterion,
      };

      const result = await createCompetency(input);

      expect(db.specialisedCompetency.create).toHaveBeenCalledWith({
        data: {
          name: input.name,
          category: input.category,
          tallyFormUrl: input.tallyFormUrl,
          criterion: input.criterion,
        },
      });
      expect(result).toEqual(mockCompetency);
    });
  });

  // ---------------------------------------------------------------------------
  describe('updateCompetency', () => {
    it('updates competency with partial data', async () => {
      const updated = { ...mockCompetency, name: 'Updated Name' };
      (db.specialisedCompetency.update as jest.Mock).mockResolvedValue(updated);

      const result = await updateCompetency(mockCompetency.id, { name: 'Updated Name' });

      expect(db.specialisedCompetency.update).toHaveBeenCalledWith({
        where: { id: mockCompetency.id },
        data: { name: 'Updated Name' },
      });
      expect(result.name).toBe('Updated Name');
    });

    it('can update isActive flag', async () => {
      const updated = { ...mockCompetency, isActive: false };
      (db.specialisedCompetency.update as jest.Mock).mockResolvedValue(updated);

      const result = await updateCompetency(mockCompetency.id, { isActive: false });

      expect(result.isActive).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  describe('deactivateCompetency', () => {
    it('sets isActive to false', async () => {
      const deactivated = { ...mockCompetency, isActive: false };
      (db.specialisedCompetency.update as jest.Mock).mockResolvedValue(deactivated);

      const result = await deactivateCompetency(mockCompetency.id);

      expect(db.specialisedCompetency.update).toHaveBeenCalledWith({
        where: { id: mockCompetency.id },
        data: { isActive: false },
      });
      expect(result.isActive).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  describe('reactivateCompetency', () => {
    it('sets isActive to true', async () => {
      const reactivated = { ...mockCompetency, isActive: true };
      (db.specialisedCompetency.update as jest.Mock).mockResolvedValue(reactivated);

      const result = await reactivateCompetency(mockCompetency.id);

      expect(db.specialisedCompetency.update).toHaveBeenCalledWith({
        where: { id: mockCompetency.id },
        data: { isActive: true },
      });
      expect(result.isActive).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  describe('getCompetenciesByIds', () => {
    it('returns active competencies matching given IDs', async () => {
      (db.specialisedCompetency.findMany as jest.Mock).mockResolvedValue([
        mockCompetency,
        mockCompetency2,
      ]);

      const ids = [mockCompetency.id, mockCompetency2.id];
      const result = await getCompetenciesByIds(ids);

      expect(db.specialisedCompetency.findMany).toHaveBeenCalledWith({
        where: { id: { in: ids }, isActive: true },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });
      expect(result).toHaveLength(2);
    });

    it('returns empty array when no IDs match', async () => {
      (db.specialisedCompetency.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getCompetenciesByIds(['no-match']);

      expect(result).toEqual([]);
    });

    it('excludes inactive competencies even if IDs match', async () => {
      // DB layer enforces isActive: true — mock returns only actives
      (db.specialisedCompetency.findMany as jest.Mock).mockResolvedValue([mockCompetency]);

      const result = await getCompetenciesByIds([mockCompetency.id, 'sc-inactive']);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockCompetency.id);
    });
  });
});
