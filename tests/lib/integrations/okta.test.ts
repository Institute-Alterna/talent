/**
 * Okta Integration Tests
 *
 * Tests for the Okta API client.
 */

import {
  isOktaConfigured,
  OktaApiError,
} from '@/lib/integrations/okta';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Store original env
const originalEnv = process.env;

describe('Okta Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset env for each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isOktaConfigured', () => {
    it('returns true when OKTA_DOMAIN and OKTA_API_TOKEN are set', () => {
      process.env.OKTA_DOMAIN = 'test.okta.com';
      process.env.OKTA_API_TOKEN = 'test-token';

      expect(isOktaConfigured()).toBe(true);
    });

    it('returns false when OKTA_DOMAIN is missing', () => {
      delete process.env.OKTA_DOMAIN;
      process.env.OKTA_API_TOKEN = 'test-token';

      expect(isOktaConfigured()).toBe(false);
    });

    it('returns false when OKTA_API_TOKEN is missing', () => {
      process.env.OKTA_DOMAIN = 'test.okta.com';
      delete process.env.OKTA_API_TOKEN;

      expect(isOktaConfigured()).toBe(false);
    });

    it('returns false when both are missing', () => {
      delete process.env.OKTA_DOMAIN;
      delete process.env.OKTA_API_TOKEN;

      expect(isOktaConfigured()).toBe(false);
    });
  });

  describe('OktaApiError', () => {
    it('creates error with message and status code', () => {
      const error = new OktaApiError('Test error', 404);

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('OktaApiError');
    });

    it('creates error with optional fields', () => {
      const error = new OktaApiError('Test error', 400, 'E0000001', 'error-123');

      expect(error.errorCode).toBe('E0000001');
      expect(error.errorId).toBe('error-123');
    });
  });

  describe('Okta API functions', () => {
    beforeEach(() => {
      process.env.OKTA_DOMAIN = 'test.okta.com';
      process.env.OKTA_API_TOKEN = 'test-api-token';
      process.env.ADMIN_OKTA_GROUP_ID = 'admin-group-123';
    });

    describe('when Okta returns users', () => {
      it('makes authenticated API requests', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => [],
          headers: new Map([['Link', '']]),
        });

        // Import dynamically to get fresh module with mocked env
        const { getOktaUsers } = await import('@/lib/integrations/okta');
        await getOktaUsers();

        expect(mockFetch).toHaveBeenCalledWith(
          'https://test.okta.com/api/v1/users?limit=200',
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'SSWS test-api-token',
              Accept: 'application/json',
              'Content-Type': 'application/json',
            }),
          })
        );
      });
    });
  });
});
