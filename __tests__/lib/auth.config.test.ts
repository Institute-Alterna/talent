/**
 * Auth Configuration Unit Tests
 *
 * Tests for the NextAuth configuration module.
 * These tests verify the configuration structure without making external calls.
 *
 * Note: We mock the next-auth provider to avoid ESM issues with Jest.
 */

// Mock next-auth provider before importing auth.config
jest.mock('next-auth/providers/okta', () => ({
  __esModule: true,
  default: jest.fn((config) => ({
    id: 'okta',
    name: 'Okta',
    type: 'oidc',
    ...config,
  })),
}));

// Now import the auth config
import { authConfig } from '@/lib/auth.config';

describe('Auth Configuration', () => {
  describe('authConfig', () => {
    it('is defined and is an object', () => {
      expect(authConfig).toBeDefined();
      expect(typeof authConfig).toBe('object');
    });

    it('has providers array', () => {
      expect(authConfig.providers).toBeDefined();
      expect(Array.isArray(authConfig.providers)).toBe(true);
    });

    it('has at least one provider configured', () => {
      expect(authConfig.providers.length).toBeGreaterThan(0);
    });

    it('uses JWT session strategy', () => {
      expect(authConfig.session).toBeDefined();
      expect(authConfig.session?.strategy).toBe('jwt');
    });

    it('has session maxAge set to 8 hours', () => {
      expect(authConfig.session?.maxAge).toBe(8 * 60 * 60);
    });
  });

  describe('Custom Pages', () => {
    it('has custom signIn page configured', () => {
      expect(authConfig.pages).toBeDefined();
      expect(authConfig.pages?.signIn).toBe('/');
    });

    it('has custom error page configured', () => {
      expect(authConfig.pages?.error).toBe('/auth/error');
    });
  });

  describe('Callbacks', () => {
    it('has authorized callback defined', () => {
      expect(authConfig.callbacks).toBeDefined();
      expect(authConfig.callbacks?.authorized).toBeDefined();
      expect(typeof authConfig.callbacks?.authorized).toBe('function');
    });
  });
});

/* eslint-disable @typescript-eslint/no-explicit-any -- mock auth params don't match full NextAuth types */
describe('Auth Configuration - Route Protection', () => {
  describe('authorized callback', () => {
    const mockAuthorized = authConfig.callbacks?.authorized;

    const createMockRequest = (pathname: string) => ({
      nextUrl: new URL(`http://localhost:3000${pathname}`),
    });

    it('allows access to public routes for unauthenticated users', async () => {
      if (!mockAuthorized) {
        throw new Error('authorized callback not defined');
      }

      const publicPaths = ['/', '/auth/error', '/api/webhooks/tally'];

      for (const path of publicPaths) {
        const result = await mockAuthorized({
          auth: null,
          request: createMockRequest(path),
        } as any);
        expect(result).toBe(true);
      }
    });

    it('blocks access to /dashboard for unauthenticated users', async () => {
      if (!mockAuthorized) {
        throw new Error('authorized callback not defined');
      }

      const result = await mockAuthorized({
        auth: null,
        request: createMockRequest('/dashboard'),
      } as any);
      expect(result).toBe(false);
    });

    it('blocks access to /candidates for unauthenticated users', async () => {
      if (!mockAuthorized) {
        throw new Error('authorized callback not defined');
      }

      const result = await mockAuthorized({
        auth: null,
        request: createMockRequest('/candidates'),
      } as any);
      expect(result).toBe(false);
    });

    it('blocks access to /settings for unauthenticated users', async () => {
      if (!mockAuthorized) {
        throw new Error('authorized callback not defined');
      }

      const result = await mockAuthorized({
        auth: null,
        request: createMockRequest('/settings'),
      } as any);
      expect(result).toBe(false);
    });

    it('blocks access to /users for unauthenticated users', async () => {
      if (!mockAuthorized) {
        throw new Error('authorized callback not defined');
      }

      const result = await mockAuthorized({
        auth: null,
        request: createMockRequest('/users'),
      } as any);
      expect(result).toBe(false);
    });

    it('allows access to protected routes for authenticated users', async () => {
      if (!mockAuthorized) {
        throw new Error('authorized callback not defined');
      }

      const mockAuth = {
        user: { email: 'test@example.com', name: 'Test User' },
      };

      const protectedPaths = ['/dashboard', '/candidates', '/settings', '/users'];

      for (const path of protectedPaths) {
        const result = await mockAuthorized({
          auth: mockAuth,
          request: createMockRequest(path),
        } as any);
        expect(result).toBe(true);
      }
    });

    it('blocks nested protected routes for unauthenticated users', async () => {
      if (!mockAuthorized) {
        throw new Error('authorized callback not defined');
      }

      const nestedPaths = [
        '/dashboard/overview',
        '/candidates/123',
        '/settings/profile',
        '/users/list',
      ];

      for (const path of nestedPaths) {
        const result = await mockAuthorized({
          auth: null,
          request: createMockRequest(path),
        } as any);
        expect(result).toBe(false);
      }
    });
  });
});
