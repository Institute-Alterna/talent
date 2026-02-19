/**
 * Person Detail API Route Tests
 *
 * Tests for the /api/persons/[id] endpoint.
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}));

// Mock persons service
jest.mock('@/lib/services/persons', () => ({
  getPersonWithApplications: jest.fn(),
}));

// Mock audit
jest.mock('@/lib/audit', () => ({
  getAuditLogsForPerson: jest.fn(),
  logRecordViewed: jest.fn(),
}));

// Mock email
jest.mock('@/lib/email', () => ({
  getEmailLogsForPerson: jest.fn(),
}));

// Mock security
jest.mock('@/lib/security', () => {
  const actual = jest.requireActual('@/lib/security');
  return {
    ...actual,
    sanitizeForLog: jest.fn((s) => s),
  };
});

import { GET } from '@/app/api/persons/[id]/route';
import { auth } from '@/lib/auth';
import { getPersonWithApplications } from '@/lib/services/persons';
import { getAuditLogsForPerson, logRecordViewed } from '@/lib/audit';
import { getEmailLogsForPerson } from '@/lib/email';

const mockAuthAdmin = {
  user: {
    id: 'user-1',
    email: 'admin@alterna.dev',
    name: 'Admin User',
    isAdmin: true,
    hasAccess: true,
    dbUserId: 'db-user-1',
  },
};

const mockAuthHiringManager = {
  user: {
    id: 'user-2',
    email: 'hiring@alterna.dev',
    name: 'Hiring Manager',
    isAdmin: false,
    hasAccess: true,
    dbUserId: 'db-user-2',
  },
};

const mockAuthNoAccess = {
  user: {
    id: 'user-3',
    email: 'noaccess@alterna.dev',
    name: 'No Access User',
    isAdmin: false,
    hasAccess: false,
    dbUserId: 'db-user-3',
  },
};

const mockPersonId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const mockInvalidId = 'not-a-uuid';

const mockPerson = {
  id: mockPersonId,
  email: 'john@example.com',
  firstName: 'John',
  middleName: null,
  lastName: 'Doe',
  secondaryEmail: null,
  phoneNumber: '+1234567890',
  country: 'US',
  city: 'New York',
  state: 'NY',
  countryCode: 'US',
  portfolioLink: 'https://portfolio.example.com',
  educationLevel: 'Bachelor',
  generalCompetenciesCompleted: true,
  generalCompetenciesScore: '85.00',
  generalCompetenciesPassedAt: new Date('2024-01-10'),
  tallyRespondentId: 'tally-123',
  oktaUserId: null,
  createdAt: new Date('2024-01-05'),
  updatedAt: new Date('2024-01-15'),
  applications: [
    {
      id: 'app-1',
      position: 'Software Engineer',
      currentStage: 'INTERVIEW',
      status: 'ACTIVE',
      createdAt: new Date('2024-01-05'),
    },
    {
      id: 'app-2',
      position: 'Data Analyst',
      currentStage: 'APPLICATION',
      status: 'ACTIVE',
      createdAt: new Date('2024-01-15'),
    },
  ],
};

const mockAuditLogs = [
  {
    id: 'audit-1',
    action: 'Person record created',
    actionType: 'CREATE',
    createdAt: new Date('2024-01-05'),
    user: null,
  },
];

const mockEmailLogs = [
  {
    id: 'email-1',
    templateName: 'application-received',
    subject: 'Application Received',
    status: 'SENT',
    sentAt: new Date('2024-01-05'),
  },
];

describe('GET /api/persons/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getPersonWithApplications as jest.Mock).mockResolvedValue(mockPerson);
    (getAuditLogsForPerson as jest.Mock).mockResolvedValue(mockAuditLogs);
    (getEmailLogsForPerson as jest.Mock).mockResolvedValue(mockEmailLogs);
    (logRecordViewed as jest.Mock).mockResolvedValue(undefined);
  });

  const createRequest = (id: string, query: string = '') => {
    return new NextRequest(`http://localhost:3000/api/persons/${id}${query}`);
  };

  const createParams = (id: string) => Promise.resolve({ id });

  it('returns 400 for invalid UUID format', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = createRequest(mockInvalidId);
    const response = await GET(request, { params: createParams(mockInvalidId) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid person ID format');
  });

  it('returns 401 when not authenticated', async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const request = createRequest(mockPersonId);
    const response = await GET(request, { params: createParams(mockPersonId) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 403 for users without app access', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthNoAccess);

    const request = createRequest(mockPersonId);
    const response = await GET(request, { params: createParams(mockPersonId) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden - App access required');
  });

  it('returns 404 when person not found', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);
    (getPersonWithApplications as jest.Mock).mockResolvedValue(null);

    const request = createRequest(mockPersonId);
    const response = await GET(request, { params: createParams(mockPersonId) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Person not found');
  });

  it('returns person details for admin users', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = createRequest(mockPersonId);
    const response = await GET(request, { params: createParams(mockPersonId) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.person.id).toBe(mockPersonId);
    expect(data.person.email).toBe('john@example.com');
    expect(data.person.firstName).toBe('John');
    expect(data.person.lastName).toBe('Doe');
    expect(data.person.applications).toHaveLength(2);
  });

  it('returns person details for hiring managers', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthHiringManager);

    const request = createRequest(mockPersonId);
    const response = await GET(request, { params: createParams(mockPersonId) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.person.id).toBe(mockPersonId);
    expect(data.person.email).toBe('john@example.com');
  });

  it('includes audit logs when requested', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = createRequest(mockPersonId, '?includeAuditLogs=true');
    const response = await GET(request, { params: createParams(mockPersonId) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.auditLogs).toHaveLength(1);
    expect(data.auditLogs[0].action).toBe('Person record created');
    expect(getAuditLogsForPerson).toHaveBeenCalledWith(mockPersonId, { limit: 50 });
  });

  it('includes email logs when requested', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = createRequest(mockPersonId, '?includeEmailLogs=true');
    const response = await GET(request, { params: createParams(mockPersonId) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.emailLogs).toHaveLength(1);
    expect(data.emailLogs[0].templateName).toBe('application-received');
    expect(getEmailLogsForPerson).toHaveBeenCalledWith(mockPersonId, 50);
  });

  it('logs record view for admins', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);

    const request = createRequest(mockPersonId);
    await GET(request, { params: createParams(mockPersonId) });

    expect(logRecordViewed).toHaveBeenCalledWith(
      mockPersonId,
      null,
      mockAuthAdmin.user.dbUserId,
      'person_detail'
    );
  });

  it('does not log record view for hiring managers', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthHiringManager);

    const request = createRequest(mockPersonId);
    await GET(request, { params: createParams(mockPersonId) });

    expect(logRecordViewed).not.toHaveBeenCalled();
  });

  it('returns 500 on error', async () => {
    (auth as jest.Mock).mockResolvedValue(mockAuthAdmin);
    (getPersonWithApplications as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = createRequest(mockPersonId);
    const response = await GET(request, { params: createParams(mockPersonId) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
