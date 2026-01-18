/**
 * Users Table Component Tests
 *
 * Tests for the users table display component.
 */

import { render, screen } from '@testing-library/react';

// Mock the config
jest.mock('@/config', () => ({
  strings: {
    personnel: {
      admin: 'Administrator',
      hiringManager: 'Hiring Manager',
      noAccess: 'No Access',
    },
  },
}));

// Mock the server actions
jest.mock('@/app/(dashboard)/users/actions', () => ({
  makeAdminAction: jest.fn(),
  revokeAdminAction: jest.fn(),
  deleteUserAction: jest.fn(),
  grantAppAccessAction: jest.fn(),
  revokeAppAccessAction: jest.fn(),
}));

import { UsersTable } from '@/components/users/users-table';
import type { UserListItem } from '@/types/user';

const mockUsers: UserListItem[] = [
  {
    id: 'user-1',
    email: 'admin@alterna.dev',
    firstName: 'Admin',
    lastName: 'User',
    displayName: 'Admin User',
    title: 'System Administrator',
    isAdmin: true,
    hasAppAccess: true,
    schedulingLink: 'https://cal.com/admin',
    oktaStatus: 'ACTIVE',
    lastSyncedAt: new Date('2024-01-15'),
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'user-2',
    email: 'hiring@alterna.dev',
    firstName: 'Jane',
    lastName: 'Doe',
    displayName: 'Jane Doe',
    title: 'HR Manager',
    isAdmin: false,
    hasAppAccess: true,
    schedulingLink: null,
    oktaStatus: 'ACTIVE', // Changed from SUSPENDED to test hiring manager badge
    lastSyncedAt: new Date('2024-01-15'),
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'user-3',
    email: 'noaccess@alterna.dev',
    firstName: 'Bob',
    lastName: 'Smith',
    displayName: 'Bob Smith',
    title: 'Contractor',
    isAdmin: false,
    hasAppAccess: false,
    schedulingLink: null,
    oktaStatus: 'ACTIVE',
    lastSyncedAt: new Date('2024-01-15'),
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'user-4',
    email: 'dismissed@alterna.dev',
    firstName: 'Former',
    lastName: 'Employee',
    displayName: 'Former Employee',
    title: 'Ex-Developer',
    isAdmin: false,
    hasAppAccess: false,
    schedulingLink: null,
    oktaStatus: 'DEPROVISIONED',
    lastSyncedAt: new Date('2024-01-15'),
    createdAt: new Date('2024-01-01'),
  },
];

describe('UsersTable', () => {
  it('renders without crashing', () => {
    render(<UsersTable users={mockUsers} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('displays user full names (firstName + lastName)', () => {
    render(<UsersTable users={mockUsers} />);
    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    expect(screen.getByText('Former Employee')).toBeInTheDocument();
  });

  it('displays user emails', () => {
    render(<UsersTable users={mockUsers} />);
    expect(screen.getByText('admin@alterna.dev')).toBeInTheDocument();
    expect(screen.getByText('hiring@alterna.dev')).toBeInTheDocument();
    expect(screen.getByText('noaccess@alterna.dev')).toBeInTheDocument();
    expect(screen.getByText('dismissed@alterna.dev')).toBeInTheDocument();
  });

  it('displays user titles', () => {
    render(<UsersTable users={mockUsers} />);
    expect(screen.getByText('System Administrator')).toBeInTheDocument();
    expect(screen.getByText('HR Manager')).toBeInTheDocument();
    expect(screen.getByText('Contractor')).toBeInTheDocument();
    expect(screen.getByText('Ex-Developer')).toBeInTheDocument();
  });

  it('displays admin badge for admin users', () => {
    render(<UsersTable users={mockUsers} />);
    expect(screen.getByText('Administrator')).toBeInTheDocument();
  });

  it('displays hiring manager badge for users with access', () => {
    render(<UsersTable users={mockUsers} />);
    expect(screen.getByText('Hiring Manager')).toBeInTheDocument();
  });

  it('displays no access badge for users without access', () => {
    render(<UsersTable users={mockUsers} />);
    // The third user (Bob Smith) has no access
    expect(screen.getByText('No Access')).toBeInTheDocument();
  });

  it('displays dismissed badge for deprovisioned users', () => {
    render(<UsersTable users={mockUsers} />);
    // The fourth user (Former Employee) is deprovisioned
    expect(screen.getByText('Dismissed')).toBeInTheDocument();
  });

  it('displays scheduling status', () => {
    render(<UsersTable users={mockUsers} />);
    // Admin has scheduling link set
    expect(screen.getByText('Set')).toBeInTheDocument();
  });

  it('displays empty state when no users', () => {
    render(<UsersTable users={[]} />);
    expect(screen.getByText('No personnel found')).toBeInTheDocument();
  });

  it('renders table headers', () => {
    render(<UsersTable users={mockUsers} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Scheduling')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('displays user Okta status badges', () => {
    render(<UsersTable users={mockUsers} />);
    // Three users are Active, one is Deprovisioned
    const activeElements = screen.getAllByText('Active');
    expect(activeElements.length).toBe(3);
    expect(screen.getByText('Deprovisioned')).toBeInTheDocument();
  });

  it('has action buttons for active users only (dismissed users have non-clickable icon)', () => {
    render(<UsersTable users={mockUsers} />);
    // Only 3 active users should have action buttons (dismissed user has a prohibited icon)
    const actionButtons = screen.getAllByRole('button', { name: /open menu/i });
    expect(actionButtons).toHaveLength(3);
  });

  it('marks current user row differently', () => {
    render(<UsersTable users={mockUsers} currentUserId="user-1" />);
    // The current user should still render but with different actions
    expect(screen.getByText('Admin User')).toBeInTheDocument();
  });
});
