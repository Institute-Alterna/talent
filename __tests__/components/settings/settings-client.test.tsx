/**
 * Settings Client Component Tests
 *
 * Tests for the settings page client component.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the config
jest.mock('@/config', () => ({
  strings: {
    settings: {
      title: 'Settings',
      profile: 'Profile',
      profileDescription: 'Your profile information from Universal Access',
      profileNote: 'Profile information is managed in Universal Access. Changes sync on next login.',
      schedulingLink: 'Scheduling Link',
      schedulingLinkHelp: 'Your Cal.com or Calendly link for candidate interviews',
      schedulingLinkMissing: 'Please set your scheduling link to conduct interviews',
      activityHistory: 'Activity History',
    },
    personnel: {
      admin: 'Administrator',
      hiringManager: 'Hiring Manager',
    },
    empty: {
      noActivity: 'No activity yet',
    },
  },
}));

// Mock utils
jest.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  formatDateTime: (date: Date | string | null | undefined) => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  },
}));

// Mock server actions
jest.mock('@/app/(dashboard)/settings/actions', () => ({
  fetchUserSettings: jest.fn(),
  updateSchedulingLinkAction: jest.fn(),
  fetchUserActivityHistory: jest.fn(),
}));

import { SettingsClient } from '@/app/(dashboard)/settings/page-client';
import {
  fetchUserSettings,
  updateSchedulingLinkAction,
  fetchUserActivityHistory,
} from '@/app/(dashboard)/settings/actions';

const mockUser = {
  id: 'user-123',
  email: 'test@alterna.dev',
  displayName: 'Test User',
  firstName: 'Test',
  lastName: 'User',
  title: 'Developer',
  isAdmin: false,
  schedulingLink: null,
  timezone: 'America/New_York',
  preferredLanguage: 'en',
  createdAt: new Date('2024-01-01'),
  lastSyncedAt: new Date('2024-01-15'),
};

const mockUserWithSchedulingLink = {
  ...mockUser,
  schedulingLink: 'https://calendly.com/test',
};

const mockActivities = [
  {
    id: 'activity-1',
    action: 'Viewed application',
    actionType: 'VIEW',
    details: null,
    createdAt: new Date('2024-01-15T10:30:00Z'),
    person: {
      id: 'person-1',
      firstName: 'John',
      lastName: 'Doe',
    },
    application: {
      id: 'application-1',
      position: 'Software Developer',
    },
  },
];

const defaultProps = {
  initialUser: {
    name: 'Test User',
    email: 'test@alterna.dev',
    isAdmin: false,
    dbUserId: 'user-123',
  },
};

describe('SettingsClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementations
    (fetchUserSettings as jest.Mock).mockResolvedValue({
      success: true,
      data: { user: mockUser },
    });
    (fetchUserActivityHistory as jest.Mock).mockResolvedValue({
      success: true,
      data: { activities: [], total: 0 },
    });
  });

  it('renders settings page with title', async () => {
    render(<SettingsClient {...defaultProps} />);

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Manage your profile and preferences')).toBeInTheDocument();

    // Wait for async data loading to complete to avoid act() warnings
    await waitFor(() => {
      expect(fetchUserSettings).toHaveBeenCalled();
    });
  });

  it('displays profile information from session', async () => {
    render(<SettingsClient {...defaultProps} />);

    // Should display initial user info from props
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('test@alterna.dev')).toBeInTheDocument();

    // Wait for async data loading to complete to avoid act() warnings
    await waitFor(() => {
      expect(fetchUserSettings).toHaveBeenCalled();
    });
  });

  it('shows scheduling link warning when no link is set', async () => {
    render(<SettingsClient {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByText('Please set your scheduling link to conduct interviews')
      ).toBeInTheDocument();
    });
  });

  it('shows "Set Scheduling Link" button when no link is set', async () => {
    render(<SettingsClient {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /set scheduling link/i })).toBeInTheDocument();
    });
  });

  it('does not show warning when scheduling link is set', async () => {
    (fetchUserSettings as jest.Mock).mockResolvedValue({
      success: true,
      data: { user: mockUserWithSchedulingLink },
    });

    render(<SettingsClient {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.queryByText('Please set your scheduling link to conduct interviews')
      ).not.toBeInTheDocument();
    });
  });

  it('shows existing scheduling link when set', async () => {
    (fetchUserSettings as jest.Mock).mockResolvedValue({
      success: true,
      data: { user: mockUserWithSchedulingLink },
    });

    render(<SettingsClient {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('https://calendly.com/test')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /change scheduling link/i })).toBeInTheDocument();
    });
  });

  it('displays activity history section', async () => {
    render(<SettingsClient {...defaultProps} />);

    expect(screen.getByText('Activity History')).toBeInTheDocument();
    expect(screen.getByText('Your recent actions in the system')).toBeInTheDocument();

    // Wait for async data loading to complete to avoid act() warnings
    await waitFor(() => {
      expect(fetchUserActivityHistory).toHaveBeenCalled();
    });
  });

  it('shows empty state when no activity', async () => {
    render(<SettingsClient {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('No activity yet')).toBeInTheDocument();
    });
  });

  it('displays activities when present', async () => {
    (fetchUserActivityHistory as jest.Mock).mockResolvedValue({
      success: true,
      data: { activities: mockActivities, total: 1 },
    });

    render(<SettingsClient {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Viewed application')).toBeInTheDocument();
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    });
  });

  it('shows edit mode when clicking set scheduling link', async () => {
    const user = userEvent.setup();
    render(<SettingsClient {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /set scheduling link/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /set scheduling link/i }));

    expect(screen.getByLabelText(/scheduling url/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('can cancel editing scheduling link', async () => {
    const user = userEvent.setup();
    render(<SettingsClient {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /set scheduling link/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /set scheduling link/i }));
    expect(screen.getByLabelText(/scheduling url/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByLabelText(/scheduling url/i)).not.toBeInTheDocument();
    });
  });

  it('saves scheduling link when form is submitted', async () => {
    const user = userEvent.setup();
    (updateSchedulingLinkAction as jest.Mock).mockResolvedValue({
      success: true,
      data: { schedulingLink: 'https://cal.com/newlink' },
    });

    render(<SettingsClient {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /set scheduling link/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /set scheduling link/i }));

    const input = screen.getByLabelText(/scheduling url/i);
    await user.type(input, 'https://cal.com/newlink');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(updateSchedulingLinkAction).toHaveBeenCalledWith('https://cal.com/newlink');
    });
  });

  it('displays admin badge for admin users', async () => {
    render(
      <SettingsClient
        initialUser={{
          ...defaultProps.initialUser,
          isAdmin: true,
        }}
      />
    );

    expect(screen.getByText('Administrator')).toBeInTheDocument();

    // Wait for async data loading to complete to avoid act() warnings
    await waitFor(() => {
      expect(fetchUserSettings).toHaveBeenCalled();
    });
  });

  it('displays hiring manager badge for non-admin users', async () => {
    render(<SettingsClient {...defaultProps} />);

    expect(screen.getByText('Hiring Manager')).toBeInTheDocument();

    // Wait for async data loading to complete to avoid act() warnings
    await waitFor(() => {
      expect(fetchUserSettings).toHaveBeenCalled();
    });
  });

  it('displays load more button when more activities exist', async () => {
    (fetchUserActivityHistory as jest.Mock).mockResolvedValue({
      success: true,
      data: { activities: mockActivities, total: 15 },
    });

    render(<SettingsClient {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument();
    });
  });

  it('loads more activities when button is clicked', async () => {
    const user = userEvent.setup();
    (fetchUserActivityHistory as jest.Mock)
      .mockResolvedValueOnce({
        success: true,
        data: { activities: mockActivities, total: 15 },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          activities: [
            {
              id: 'activity-2',
              action: 'Updated application',
              actionType: 'UPDATE',
              details: null,
              createdAt: new Date('2024-01-14T09:00:00Z'),
              person: null,
              application: null,
            },
          ],
          total: 15,
        },
      });

    render(<SettingsClient {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /load more/i }));

    await waitFor(() => {
      expect(fetchUserActivityHistory).toHaveBeenCalledTimes(2);
      expect(fetchUserActivityHistory).toHaveBeenLastCalledWith({
        limit: 10,
        offset: 1,
      });
    });
  });
});
