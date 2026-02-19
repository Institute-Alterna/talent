/**
 * Home Page Tests
 *
 * Tests for the login page functionality.
 *
 * Note: Since the home page now uses server-side authentication (auth()),
 * we need to mock the auth module for testing. These tests verify the
 * UI renders correctly for unauthenticated users.
 */

import { render, screen } from '@testing-library/react';

// Mock the auth module before importing the page
jest.mock('@/lib/auth', () => ({
  auth: jest.fn(() => Promise.resolve(null)), // Simulate no session
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

// Import after mocking
import Home from '@/app/page';
import { branding, strings } from '@/config';

describe('Home Page (Login)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test: Page renders without crashing
   */
  it('renders without crashing', async () => {
    const HomeComponent = await Home();
    render(HomeComponent);
    expect(screen.getByRole('img', { name: branding.appName })).toBeInTheDocument();
  });

  /**
   * Test: Displays the wordmark SVG with accessible label
   */
  it('displays the wordmark with accessible label', async () => {
    const HomeComponent = await Home();
    render(HomeComponent);
    expect(screen.getByRole('img', { name: branding.appName })).toBeInTheDocument();
  });

  /**
   * Test: Shows the welcome message from strings config
   */
  it('shows the authorization message', async () => {
    const HomeComponent = await Home();
    render(HomeComponent);
    // The new login page doesn't have the dashboard welcome text - it's on a separate panel
    expect(screen.getByText(strings.login.subtitle)).toBeInTheDocument();
  });

  /**
   * Test: Renders an Authenticate button
   */
  it('renders an Authenticate button', async () => {
    const HomeComponent = await Home();
    render(HomeComponent);
    expect(screen.getByRole('button', { name: /authenticate with/i })).toBeInTheDocument();
  });

  /**
   * Test: Shows authorization message
   */
  it('shows authorization information', async () => {
    const HomeComponent = await Home();
    render(HomeComponent);
    expect(
      screen.getByText(/only authorised personnel may access/i)
    ).toBeInTheDocument();
  });
});

/* eslint-disable @typescript-eslint/no-require-imports -- dynamic mock overrides in test */
describe('Home Page (Authenticated redirect)', () => {
  it('redirects authenticated users to dashboard', async () => {
    // Override the mock for this test
    const { auth } = require('@/lib/auth');
    auth.mockResolvedValueOnce({
      user: {
        name: 'Test User',
        email: 'test@example.com',
        isAdmin: false,
      },
    });

    const { redirect } = require('next/navigation');

    // Call the page component
    await Home();

    // Verify redirect was called
    expect(redirect).toHaveBeenCalledWith('/dashboard');
  });
});
