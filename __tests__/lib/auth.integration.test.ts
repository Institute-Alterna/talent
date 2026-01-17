/**
 * Authentication Integration Tests
 *
 * These tests verify the Okta authentication configuration and endpoints.
 * They test the actual OAuth configuration without completing the full OAuth flow.
 *
 * Run with: npm run test:integration
 */

import 'dotenv/config';

import { describe, it, before } from 'node:test';
import assert from 'node:assert';

// Base URL for testing (uses local server)
const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

describe('Authentication Integration', () => {
  /**
   * Verify required environment variables are set
   */
  describe('Environment Configuration', () => {
    it('has OKTA_CLIENT_ID configured', () => {
      assert.ok(process.env.OKTA_CLIENT_ID, 'OKTA_CLIENT_ID must be set');
      assert.ok(process.env.OKTA_CLIENT_ID.length > 0, 'OKTA_CLIENT_ID must not be empty');
    });

    it('has OKTA_CLIENT_SECRET configured', () => {
      assert.ok(process.env.OKTA_CLIENT_SECRET, 'OKTA_CLIENT_SECRET must be set');
      assert.ok(process.env.OKTA_CLIENT_SECRET.length > 0, 'OKTA_CLIENT_SECRET must not be empty');
    });

    it('has OKTA_ISSUER configured', () => {
      assert.ok(process.env.OKTA_ISSUER, 'OKTA_ISSUER must be set');
      assert.ok(process.env.OKTA_ISSUER.startsWith('https://'), 'OKTA_ISSUER must be HTTPS URL');
    });

    it('has OKTA_DOMAIN configured', () => {
      assert.ok(process.env.OKTA_DOMAIN, 'OKTA_DOMAIN must be set');
    });

    it('has NEXTAUTH_SECRET configured', () => {
      assert.ok(process.env.NEXTAUTH_SECRET, 'NEXTAUTH_SECRET must be set');
      assert.ok(process.env.NEXTAUTH_SECRET.length >= 32, 'NEXTAUTH_SECRET must be at least 32 characters');
    });

    it('has NEXTAUTH_URL configured', () => {
      assert.ok(process.env.NEXTAUTH_URL, 'NEXTAUTH_URL must be set');
    });
  });

  /**
   * Verify Okta issuer is accessible
   */
  describe('Okta OpenID Configuration', () => {
    it('can fetch Okta well-known configuration', async () => {
      const issuer = process.env.OKTA_ISSUER;
      const response = await fetch(`${issuer}/.well-known/openid-configuration`);

      assert.strictEqual(response.status, 200, 'Okta well-known endpoint should return 200');

      const config = await response.json();
      assert.ok(config.issuer, 'Should have issuer');
      assert.ok(config.authorization_endpoint, 'Should have authorization_endpoint');
      assert.ok(config.token_endpoint, 'Should have token_endpoint');
      assert.ok(config.userinfo_endpoint, 'Should have userinfo_endpoint');
    });

    it('Okta issuer matches configuration', async () => {
      const issuer = process.env.OKTA_ISSUER;
      const response = await fetch(`${issuer}/.well-known/openid-configuration`);
      const config = await response.json();

      assert.strictEqual(config.issuer, issuer, 'Okta issuer should match OKTA_ISSUER env var');
    });

    it('Okta supports required scopes', async () => {
      const issuer = process.env.OKTA_ISSUER;
      const response = await fetch(`${issuer}/.well-known/openid-configuration`);
      const config = await response.json();

      const requiredScopes = ['openid', 'profile', 'email'];
      const supportedScopes = config.scopes_supported || [];

      for (const scope of requiredScopes) {
        assert.ok(
          supportedScopes.includes(scope),
          `Okta should support scope: ${scope}`
        );
      }
    });

    it('Okta supports authorization_code grant type', async () => {
      const issuer = process.env.OKTA_ISSUER;
      const response = await fetch(`${issuer}/.well-known/openid-configuration`);
      const config = await response.json();

      const grantTypes = config.grant_types_supported || [];
      assert.ok(
        grantTypes.includes('authorization_code'),
        'Okta should support authorization_code grant type'
      );
    });
  });

  /**
   * Test auth endpoints (requires running dev server)
   * Skip these if server is not running
   */
  describe('NextAuth Endpoints', async () => {
    let serverRunning = false;

    before(async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/auth/providers`, {
          signal: AbortSignal.timeout(5000),
        });
        serverRunning = response.ok;
      } catch {
        console.log('\n  ⚠️  Dev server not running - skipping endpoint tests');
        console.log(`     Run 'npm run dev' to enable endpoint tests\n`);
        serverRunning = false;
      }
    });

    it('providers endpoint returns Okta provider', async (t) => {
      if (!serverRunning) {
        t.skip('Dev server not running');
        return;
      }

      const response = await fetch(`${BASE_URL}/api/auth/providers`);
      assert.strictEqual(response.status, 200);

      const providers = await response.json();
      assert.ok(providers.okta, 'Should have Okta provider');
      assert.strictEqual(providers.okta.id, 'okta');
      assert.strictEqual(providers.okta.type, 'oidc');
    });

    it('providers endpoint includes correct callback URL', async (t) => {
      if (!serverRunning) {
        t.skip('Dev server not running');
        return;
      }

      const response = await fetch(`${BASE_URL}/api/auth/providers`);
      const providers = await response.json();

      assert.ok(
        providers.okta.callbackUrl.includes('/api/auth/callback/okta'),
        'Callback URL should include /api/auth/callback/okta'
      );
    });

    it('session endpoint returns empty or null for unauthenticated request', async (t) => {
      if (!serverRunning) {
        t.skip('Dev server not running');
        return;
      }

      const response = await fetch(`${BASE_URL}/api/auth/session`);
      assert.strictEqual(response.status, 200);

      const session = await response.json();
      // Unauthenticated requests should return null or empty object
      // NextAuth v5 returns null, older versions return {}
      const isEmptySession = session === null ||
        (typeof session === 'object' && Object.keys(session).length === 0) ||
        !session?.user;
      assert.ok(isEmptySession, 'Session should be null, empty object, or have no user');
    });

    it('initiate-login endpoint exists and redirects', async (t) => {
      if (!serverRunning) {
        t.skip('Dev server not running');
        return;
      }

      const response = await fetch(`${BASE_URL}/api/auth/okta/initiate-login`, {
        redirect: 'manual',
      });

      // Should redirect (302 or 303) to start OAuth flow
      assert.ok(
        [302, 303, 307, 308].includes(response.status),
        `Initiate login should redirect (got ${response.status})`
      );
    });

    it('signin endpoint exists', async (t) => {
      if (!serverRunning) {
        t.skip('Dev server not running');
        return;
      }

      // GET request to signin should return the signin page or redirect
      const response = await fetch(`${BASE_URL}/api/auth/signin`, {
        redirect: 'manual',
      });

      // Should be 200 (page) or redirect
      assert.ok(
        response.status === 200 || [302, 303, 307, 308].includes(response.status),
        `Signin endpoint should return 200 or redirect (got ${response.status})`
      );
    });
  });
});
