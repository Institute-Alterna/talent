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
    // CardTitle renders as a div, not a heading, so we check for the text
    expect(screen.getByText(branding.appName)).toBeInTheDocument();
  });

  /**
   * Test: Displays the app name from branding config
   */
  it('displays the app name from branding config', async () => {
    const HomeComponent = await Home();
    render(HomeComponent);
    expect(screen.getByText(branding.appName)).toBeInTheDocument();
  });

  /**
   * Test: Displays the organization name
   */
  it('displays the organization name', async () => {
    const HomeComponent = await Home();
    render(HomeComponent);
    expect(screen.getByText(branding.organisationName)).toBeInTheDocument();
  });

  /**
   * Test: Shows the welcome message from strings config
   */
  it('shows the welcome message', async () => {
    const HomeComponent = await Home();
    render(HomeComponent);
    // The welcome message is part of a longer string
    const welcomeText = `${strings.dashboard.welcome} to the talent management system.`;
    expect(screen.getByText(welcomeText)).toBeInTheDocument();
  });

  /**
   * Test: Renders a Sign In button
   */
  it('renders a Sign In button', async () => {
    const HomeComponent = await Home();
    render(HomeComponent);
    expect(screen.getByRole('button', { name: /sign in with okta/i })).toBeInTheDocument();
  });

  /**
   * Test: Shows Okta redirect message
   */
  it('shows Okta redirect information', async () => {
    const HomeComponent = await Home();
    render(HomeComponent);
    expect(
      screen.getByText(/you will be redirected to okta/i)
    ).toBeInTheDocument();
  });
});

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
