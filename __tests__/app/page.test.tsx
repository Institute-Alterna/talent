/**
 * Home Page Tests
 *
 * This is our first test file! Here's what's happening:
 *
 * 1. We import testing utilities from @testing-library/react
 * 2. We import the component we want to test
 * 3. We use describe() to group related tests
 * 4. We use it() or test() to define individual test cases
 * 5. We use render() to render the component in a virtual DOM
 * 6. We use screen queries to find elements
 * 7. We use expect() with matchers to make assertions
 *
 * Common screen queries:
 * - getByText: Find element by text content (throws if not found)
 * - getByRole: Find element by accessibility role
 * - queryByText: Find element by text (returns null if not found)
 * - findByText: Find element by text (async, waits for element)
 */

import { render, screen } from '@testing-library/react';
import Home from '@/app/page';
import { branding, strings } from '@/config';

describe('Home Page', () => {
  /**
   * Test: Page renders without crashing
   *
   * This is a "smoke test" - it just verifies the component can render
   * without throwing an error. It's a good starting point for any component.
   */
  it('renders without crashing', () => {
    // render() mounts the component in a virtual DOM
    render(<Home />);

    // If we get here without an error, the test passes
    // But let's also verify something is on the page
    expect(document.body).toBeInTheDocument();
  });

  /**
   * Test: Displays the app name from branding config
   *
   * This verifies that:
   * 1. The config files are being imported correctly
   * 2. The branding values are being rendered
   */
  it('displays the app name from branding config', () => {
    render(<Home />);

    // getByText throws an error if the text is not found
    // This ensures the app name from our config is displayed
    const appName = screen.getByText(branding.appName);
    expect(appName).toBeInTheDocument();
  });

  /**
   * Test: Displays the organization name
   */
  it('displays the organization name', () => {
    render(<Home />);

    const orgName = screen.getByText(branding.organisationName);
    expect(orgName).toBeInTheDocument();
  });

  /**
   * Test: Displays the welcome message from strings config
   */
  it('displays the welcome message', () => {
    render(<Home />);

    // The welcome message includes an exclamation and additional text
    // We use a regex to match partial text
    const welcomeText = screen.getByText(new RegExp(strings.dashboard.welcome));
    expect(welcomeText).toBeInTheDocument();
  });

  /**
   * Test: Renders the Sign In button
   *
   * Using getByRole is preferred for accessibility - it finds elements
   * by their ARIA role, which is how screen readers see them.
   */
  it('renders a Sign In button', () => {
    render(<Home />);

    // Find button by its role and name (text content)
    const signInButton = screen.getByRole('button', { name: /sign in/i });
    expect(signInButton).toBeInTheDocument();
  });

  /**
   * Test: Shows the setup status checklist
   */
  it('shows the setup status section', () => {
    render(<Home />);

    const setupStatus = screen.getByText('Setup Status');
    expect(setupStatus).toBeInTheDocument();

    // Verify at least some checklist items are present
    expect(screen.getByText(/Next.js 14/)).toBeInTheDocument();
    expect(screen.getByText(/TypeScript/)).toBeInTheDocument();
    expect(screen.getByText(/shadcn\/ui/)).toBeInTheDocument();
  });
});
