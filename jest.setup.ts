/**
 * Jest Setup File
 *
 * This file runs after Jest is initialized but before any tests run.
 * It's the place to:
 * - Import global test utilities
 * - Set up mocks that apply to all tests
 * - Configure test environment
 *
 * The @testing-library/jest-dom package adds custom matchers like:
 * - toBeInTheDocument()
 * - toHaveTextContent()
 * - toBeVisible()
 * - toBeDisabled()
 * - And many more!
 *
 * These make it easier to write assertions about DOM elements.
 */

import '@testing-library/jest-dom';

// You can add global mocks here. For example:
// jest.mock('next/router', () => require('next-router-mock'));

