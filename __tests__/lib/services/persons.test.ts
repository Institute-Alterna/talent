/**
 * Person Service Tests
 *
 * Unit tests for the Person service layer.
 * Tests use mocked Prisma client to avoid database dependencies.
 */

import { db } from '@/lib/db';
import {
  getPersons,
  getPersonById,
  getPersonByEmail,
  getPersonWithApplications,
  findOrCreatePerson,
  createPerson,
  updatePerson,
  updateGeneralCompetencies,
  hasPassedGeneralCompetencies,
  getPersonStats,
  deletePerson,
  searchPersons,
} from '@/lib/services/persons';

// Mock the database
jest.mock('@/lib/db', () => ({
  db: {
    person: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    application: {
      findMany: jest.fn(),
    },
  },
}));

const mockPerson = {
  id: 'person-123',
  email: 'test@example.com',
  firstName: 'Test',
  middleName: null,
  lastName: 'User',
  secondaryEmail: null,
  phoneNumber: '+1-555-0100',
  country: 'United States',
  city: 'San Francisco',
  state: 'CA',
  countryCode: 'US',
  portfolioLink: 'https://example.com',
  educationLevel: "Bachelor's Degree",
  generalCompetenciesCompleted: false,
  generalCompetenciesScore: null,
  generalCompetenciesPassedAt: null,
  tallyRespondentId: 'tally-resp-123',
  oktaUserId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Person Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPersons', () => {
    it('returns paginated list of persons', async () => {
      const mockPersons = [
        {
          id: '1',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          country: 'US',
          generalCompetenciesCompleted: false,
          generalCompetenciesScore: null,
          createdAt: new Date(),
          _count: { applications: 1 },
        },
      ];

      (db.person.findMany as jest.Mock).mockResolvedValue(mockPersons);
      (db.person.count as jest.Mock).mockResolvedValue(1);

      const result = await getPersons({ page: 1, limit: 20 });

      expect(result.persons).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(1);
    });

    it('filters by generalCompetenciesCompleted', async () => {
      (db.person.findMany as jest.Mock).mockResolvedValue([]);
      (db.person.count as jest.Mock).mockResolvedValue(0);

      await getPersons({ generalCompetenciesCompleted: true });

      expect(db.person.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            generalCompetenciesCompleted: true,
          }),
        })
      );
    });

    it('filters by search term', async () => {
      (db.person.findMany as jest.Mock).mockResolvedValue([]);
      (db.person.count as jest.Mock).mockResolvedValue(0);

      await getPersons({ search: 'test' });

      expect(db.person.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { email: { contains: 'test' } },
              { firstName: { contains: 'test' } },
              { lastName: { contains: 'test' } },
            ],
          }),
        })
      );
    });
  });

  describe('getPersonById', () => {
    it('returns person when found', async () => {
      (db.person.findUnique as jest.Mock).mockResolvedValue(mockPerson);

      const result = await getPersonById('person-123');

      expect(result).toEqual(mockPerson);
      expect(db.person.findUnique).toHaveBeenCalledWith({
        where: { id: 'person-123' },
      });
    });

    it('returns null when not found', async () => {
      (db.person.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getPersonById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getPersonByEmail', () => {
    it('normalizes email to lowercase', async () => {
      (db.person.findUnique as jest.Mock).mockResolvedValue(null);

      await getPersonByEmail('TEST@EXAMPLE.COM');

      expect(db.person.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });
  });

  describe('findOrCreatePerson', () => {
    it('returns existing person if email matches', async () => {
      (db.person.findUnique as jest.Mock).mockResolvedValue(mockPerson);

      const result = await findOrCreatePerson({
        email: 'TEST@example.com',
        firstName: 'New',
        lastName: 'User',
      });

      expect(result.person).toEqual(mockPerson);
      expect(result.created).toBe(false);
      expect(db.person.create).not.toHaveBeenCalled();
    });

    it('creates new person if email not found', async () => {
      const newPerson = {
        ...mockPerson,
        id: 'new-123',
        email: 'new@example.com',
        firstName: 'New',
      };

      (db.person.findUnique as jest.Mock).mockResolvedValue(null);
      (db.person.create as jest.Mock).mockResolvedValue(newPerson);

      const result = await findOrCreatePerson({
        email: 'NEW@example.com',
        firstName: 'New',
        lastName: 'User',
      });

      expect(result.person).toEqual(newPerson);
      expect(result.created).toBe(true);
      expect(db.person.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'new@example.com',
          firstName: 'New',
          lastName: 'User',
        }),
      });
    });
  });

  describe('createPerson', () => {
    it('creates person with lowercase email', async () => {
      (db.person.create as jest.Mock).mockResolvedValue(mockPerson);

      const result = await createPerson({
        email: 'TEST@EXAMPLE.COM',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(result).toEqual(mockPerson);
      expect(db.person.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'test@example.com',
        }),
      });
    });
  });

  describe('updateGeneralCompetencies', () => {
    it('sets generalCompetenciesPassedAt when score meets threshold', async () => {
      const updatedPerson = {
        ...mockPerson,
        generalCompetenciesCompleted: true,
        generalCompetenciesScore: 80,
        generalCompetenciesPassedAt: new Date(),
      };

      (db.person.update as jest.Mock).mockResolvedValue(updatedPerson);

      await updateGeneralCompetencies('person-123', {
        generalCompetenciesCompleted: true,
        generalCompetenciesScore: 80, // Threshold is 70
      });

      expect(db.person.update).toHaveBeenCalledWith({
        where: { id: 'person-123' },
        data: expect.objectContaining({
          generalCompetenciesCompleted: true,
          generalCompetenciesScore: 80,
          generalCompetenciesPassedAt: expect.any(Date),
        }),
      });
    });

    it('sets generalCompetenciesPassedAt to null when score below threshold', async () => {
      const updatedPerson = {
        ...mockPerson,
        generalCompetenciesCompleted: true,
        generalCompetenciesScore: 50,
        generalCompetenciesPassedAt: null,
      };

      (db.person.update as jest.Mock).mockResolvedValue(updatedPerson);

      await updateGeneralCompetencies('person-123', {
        generalCompetenciesCompleted: true,
        generalCompetenciesScore: 50, // Below threshold of 70
      });

      expect(db.person.update).toHaveBeenCalledWith({
        where: { id: 'person-123' },
        data: expect.objectContaining({
          generalCompetenciesCompleted: true,
          generalCompetenciesScore: 50,
          generalCompetenciesPassedAt: null,
        }),
      });
    });
  });

  describe('hasPassedGeneralCompetencies', () => {
    it('returns true when score meets threshold', async () => {
      (db.person.findUnique as jest.Mock).mockResolvedValue({
        generalCompetenciesCompleted: true,
        generalCompetenciesScore: 80,
      });

      const result = await hasPassedGeneralCompetencies('person-123');

      expect(result).toBe(true);
    });

    it('returns false when score below threshold', async () => {
      (db.person.findUnique as jest.Mock).mockResolvedValue({
        generalCompetenciesCompleted: true,
        generalCompetenciesScore: 50,
      });

      const result = await hasPassedGeneralCompetencies('person-123');

      expect(result).toBe(false);
    });

    it('returns false when assessment not completed', async () => {
      (db.person.findUnique as jest.Mock).mockResolvedValue({
        generalCompetenciesCompleted: false,
        generalCompetenciesScore: null,
      });

      const result = await hasPassedGeneralCompetencies('person-123');

      expect(result).toBe(false);
    });

    it('returns false when person not found', async () => {
      (db.person.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await hasPassedGeneralCompetencies('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('getPersonStats', () => {
    it('returns correct statistics', async () => {
      (db.person.count as jest.Mock)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(50) // withActiveApplications
        .mockResolvedValueOnce(80) // completedGC
        .mockResolvedValueOnce(60) // passedGC
        .mockResolvedValueOnce(5); // hiredAsUsers

      const result = await getPersonStats();

      expect(result).toEqual({
        total: 100,
        withActiveApplications: 50,
        completedGeneralCompetencies: 80,
        passedGeneralCompetencies: 60,
        hiredAsUsers: 5,
      });
    });
  });

  describe('searchPersons', () => {
    it('searches by email, firstName, and lastName', async () => {
      const mockPersons = [
        {
          id: '1',
          email: 'john@example.com',
          firstName: 'John',
          lastName: 'Doe',
          country: 'US',
          generalCompetenciesCompleted: false,
          generalCompetenciesScore: null,
          createdAt: new Date(),
          _count: { applications: 1 },
        },
      ];

      (db.person.findMany as jest.Mock).mockResolvedValue(mockPersons);

      const result = await searchPersons('john', 10);

      expect(result).toEqual(mockPersons);
      expect(db.person.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { email: { contains: 'john' } },
              { firstName: { contains: 'john' } },
              { lastName: { contains: 'john' } },
            ],
          },
          take: 10,
        })
      );
    });
  });

  describe('deletePerson', () => {
    it('deletes person by ID', async () => {
      (db.person.delete as jest.Mock).mockResolvedValue({ id: 'person-123' });

      await deletePerson('person-123');

      expect(db.person.delete).toHaveBeenCalledWith({
        where: { id: 'person-123' },
      });
    });
  });
});
