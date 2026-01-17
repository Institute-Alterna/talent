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
      users: 'Users',
      settings: 'Settings',
      logout: 'Log out',
    },
    users: {
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
  email: 'john@alterna.org',
  isAdmin: false,
};

const mockAdminUser = {
  name: 'Admin User',
  email: 'admin@alterna.org',
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

    it('displays user name', () => {
      render(<Header user={mockUser} onSignOut={mockSignOut} />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('displays mobile menu button', () => {
      render(<Header user={mockUser} onSignOut={mockSignOut} />);
      expect(screen.getByLabelText(/open navigation menu/i)).toBeInTheDocument();
    });

    it('displays user avatar with initials', () => {
      render(<Header user={mockUser} onSignOut={mockSignOut} />);
      // John Doe -> JD
      expect(screen.getByText('JD')).toBeInTheDocument();
    });
  });

  describe('User menu', () => {
    it('displays user role for regular user', () => {
      render(<Header user={mockUser} onSignOut={mockSignOut} />);
      expect(screen.getByText('Hiring Manager')).toBeInTheDocument();
    });

    it('displays admin badge for admin user', () => {
      render(<Header user={mockAdminUser} onSignOut={mockSignOut} />);
      expect(screen.getByText('Admin')).toBeInTheDocument();
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

  describe('Fallback handling', () => {
    it('uses email initial when name is not provided', () => {
      const userWithoutName = { email: 'test@example.com', isAdmin: false };
      render(<Header user={userWithoutName} onSignOut={mockSignOut} />);
      expect(screen.getByText('T')).toBeInTheDocument();
    });

    it('displays email when name is not provided', () => {
      const userWithoutName = { email: 'test@example.com', isAdmin: false };
      render(<Header user={userWithoutName} onSignOut={mockSignOut} />);
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });
});
