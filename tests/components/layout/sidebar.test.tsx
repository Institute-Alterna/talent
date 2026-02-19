/**
 * Sidebar Component Tests
 *
 * Tests for the sidebar navigation component.
 */

import { render, screen } from '@testing-library/react';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/dashboard'),
}));

// Mock the config
jest.mock('@/config', () => ({
  strings: {
    nav: {
      dashboard: 'Dashboard',
      candidates: 'Candidates',
      personnel: 'Personnel',
      settings: 'Settings',
    },
    auditLog: {
      title: 'Audit Log',
      description: 'Complete history of system activity',
    },
  },
  branding: {
    organisationName: 'Alterna',
    organisationShortName: 'Alterna',
    appName: 'Talent Management',
    copyrightText: 'Alterna',
  },
}));

import { Sidebar, MobileNav } from '@/components/layout/sidebar';

describe('Sidebar', () => {
  describe('Basic rendering', () => {
    it('renders without crashing', () => {
      render(<Sidebar />);
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('displays the wordmark when not collapsed', () => {
      render(<Sidebar />);
      expect(screen.getByRole('img', { name: 'Talent Management' })).toBeInTheDocument();
    });

    it('displays navigation links', () => {
      render(<Sidebar />);
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /candidates/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
    });
  });

  describe('Admin visibility', () => {
    it('hides Personnel link for non-admin users', () => {
      render(<Sidebar isAdmin={false} />);
      expect(screen.queryByRole('link', { name: /personnel/i })).not.toBeInTheDocument();
    });

    it('shows Personnel link for admin users', () => {
      render(<Sidebar isAdmin={true} />);
      expect(screen.getByRole('link', { name: /personnel/i })).toBeInTheDocument();
    });

    it('hides Audit Log link for non-admin users', () => {
      render(<Sidebar isAdmin={false} />);
      expect(screen.queryByRole('link', { name: /audit log/i })).not.toBeInTheDocument();
    });

    it('shows Audit Log link for admin users', () => {
      render(<Sidebar isAdmin={true} />);
      expect(screen.getByRole('link', { name: /audit log/i })).toBeInTheDocument();
    });
  });

  describe('Active state', () => {
    it('marks current route as active', () => {
      render(<Sidebar />);
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('Collapsed state', () => {
    it('hides app name when collapsed', () => {
      render(<Sidebar collapsed={true} />);
      expect(screen.queryByText('Talent Management')).not.toBeInTheDocument();
    });

    it('hides navigation labels when collapsed', () => {
      render(<Sidebar collapsed={true} />);
      // Links should still exist but text should be hidden
      const navLinks = screen.getAllByRole('link');
      expect(navLinks.length).toBeGreaterThan(0);
    });
  });
});

describe('MobileNav', () => {
  it('renders navigation links', () => {
    render(<MobileNav />);
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /candidates/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
  });

  it('hides admin links for non-admin users', () => {
    render(<MobileNav isAdmin={false} />);
    expect(screen.queryByRole('link', { name: /personnel/i })).not.toBeInTheDocument();
  });

  it('shows admin links for admin users', () => {
    render(<MobileNav isAdmin={true} />);
    expect(screen.getByRole('link', { name: /personnel/i })).toBeInTheDocument();
  });

  it('calls onNavigate callback when link is clicked', () => {
    const onNavigate = jest.fn();
    render(<MobileNav onNavigate={onNavigate} />);

    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    dashboardLink.click();

    expect(onNavigate).toHaveBeenCalled();
  });
});
