/**
 * Header Component Tests
 *
 * Tests for the header navigation component.
 */

import { render, screen, fireEvent } from '@testing-library/react';

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
  },
}));

import { Header } from '@/components/layout/header';

const mockUser = {
  name: 'John Doe',
  email: 'john@alterna.dev',
  firstName: 'John',
  displayName: 'John Doe',
  title: 'Software Engineer',
  isAdmin: false,
};

const mockAdminUser = {
  name: 'Admin User',
  email: 'admin@alterna.dev',
  firstName: 'Admin',
  displayName: 'Admin User',
  title: 'System Administrator',
  isAdmin: true,
};

describe('Header', () => {
  const mockSignOut = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('renders without crashing', () => {
      render(<Header user={mockUser} onSignOut={mockSignOut} />);
      expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('displays user firstName when available', () => {
      render(<Header user={mockUser} onSignOut={mockSignOut} />);
      expect(screen.getByText('John')).toBeInTheDocument();
    });

    it('displays mobile menu button', () => {
      render(<Header user={mockUser} onSignOut={mockSignOut} />);
      expect(screen.getByLabelText(/open navigation menu/i)).toBeInTheDocument();
    });
  });

  describe('User menu', () => {
    it('displays user title for regular user', () => {
      render(<Header user={mockUser} onSignOut={mockSignOut} />);
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
    });

    it('displays admin badge for admin user', () => {
      render(<Header user={mockAdminUser} onSignOut={mockSignOut} />);
      // Find the Admin badge specifically (not the user's name which is also "Admin")
      const badges = screen.getAllByText('Admin');
      const adminBadge = badges.find(el => el.getAttribute('data-slot') === 'badge');
      expect(adminBadge).toBeInTheDocument();
    });

    it('has working user menu button', () => {
      render(<Header user={mockUser} onSignOut={mockSignOut} />);

      const userButton = screen.getByLabelText(/user menu/i);
      expect(userButton).toBeInTheDocument();
      expect(userButton).toHaveAttribute('aria-haspopup', 'menu');
    });

    it('user menu button is clickable', () => {
      render(<Header user={mockUser} onSignOut={mockSignOut} />);

      const userButton = screen.getByLabelText(/user menu/i);
      expect(userButton).not.toBeDisabled();
      // Click should not throw
      expect(() => fireEvent.click(userButton)).not.toThrow();
    });
  });

  describe('Display name fallback handling', () => {
    it('uses displayName when firstName is not provided', () => {
      const userWithDisplayName = {
        email: 'test@example.com',
        displayName: 'Display Name',
        isAdmin: false
      };
      render(<Header user={userWithDisplayName} onSignOut={mockSignOut} />);
      expect(screen.getByText('Display Name')).toBeInTheDocument();
    });

    it('uses name when firstName and displayName not provided', () => {
      const userWithName = {
        email: 'test@example.com',
        name: 'Full Name',
        isAdmin: false
      };
      render(<Header user={userWithName} onSignOut={mockSignOut} />);
      expect(screen.getByText('Full Name')).toBeInTheDocument();
    });

    it('uses email when no names are provided', () => {
      const userWithEmailOnly = { email: 'test@example.com', isAdmin: false };
      render(<Header user={userWithEmailOnly} onSignOut={mockSignOut} />);
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('uses "User" as fallback when nothing is provided', () => {
      const emptyUser = { isAdmin: false };
      render(<Header user={emptyUser} onSignOut={mockSignOut} />);
      expect(screen.getByText('User')).toBeInTheDocument();
    });
  });
});
