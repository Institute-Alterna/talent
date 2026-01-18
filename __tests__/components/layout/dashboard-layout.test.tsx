/**
 * Dashboard Layout Component Tests
 *
 * Tests for the main dashboard layout wrapper.
 */

import { render, screen } from '@testing-library/react';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/dashboard'),
}));

// Mock server actions
jest.mock('@/app/actions', () => ({
  signOutAction: jest.fn(),
}));

// Mock the config
jest.mock('@/config', () => ({
  strings: {
    nav: {
      dashboard: 'Dashboard',
      candidates: 'Candidates',
      personnel: 'Personnel',
      settings: 'Settings',
      logout: 'Log out',
    },
    personnel: {
      admin: 'Administrator',
      hiringManager: 'Hiring Manager',
    },
    settings: {
      profile: 'Profile',
    },
  },
  branding: {
    organisationName: 'Alterna',
    appName: 'Talent Management',
    copyrightText: 'Alterna',
  },
}));

import { DashboardLayout } from '@/components/layout/dashboard-layout';

const mockUser = {
  name: 'Test User',
  email: 'test@alterna.dev',
  firstName: 'Test',
  displayName: 'Test User',
  isAdmin: false,
};

describe('DashboardLayout', () => {
  it('renders without crashing', () => {
    render(
      <DashboardLayout user={mockUser}>
        <div>Test Content</div>
      </DashboardLayout>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders the sidebar on desktop', () => {
    render(
      <DashboardLayout user={mockUser}>
        <div>Test Content</div>
      </DashboardLayout>
    );
    // Sidebar should have navigation
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
  });

  it('renders the header', () => {
    render(
      <DashboardLayout user={mockUser}>
        <div>Test Content</div>
      </DashboardLayout>
    );
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('renders main content area', () => {
    render(
      <DashboardLayout user={mockUser}>
        <div>Page Content Here</div>
      </DashboardLayout>
    );
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByText('Page Content Here')).toBeInTheDocument();
  });

  it('displays user information in header', () => {
    render(
      <DashboardLayout user={mockUser}>
        <div>Test Content</div>
      </DashboardLayout>
    );
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('passes isAdmin to child components', () => {
    const adminUser = { ...mockUser, isAdmin: true };
    render(
      <DashboardLayout user={adminUser}>
        <div>Test Content</div>
      </DashboardLayout>
    );
    // Admin users should see Personnel link in sidebar
    expect(screen.getByRole('link', { name: /personnel/i })).toBeInTheDocument();
  });

  it('hides admin-only nav for non-admin users', () => {
    render(
      <DashboardLayout user={mockUser}>
        <div>Test Content</div>
      </DashboardLayout>
    );
    // Non-admin users should not see Personnel link
    expect(screen.queryByRole('link', { name: /personnel/i })).not.toBeInTheDocument();
  });
});
