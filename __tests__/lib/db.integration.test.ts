/**
 * Database Integration Tests
 *
 * These tests verify actual database connectivity and operations.
 * They require a running MySQL database with proper credentials.
 *
 * IMPORTANT: These tests connect to the real development database.
 * Ensure you're using the dev database (alterna_talent_dev), not production.
 *
 * Run with: npm run test:integration
 */

// Load environment variables before anything else
import 'dotenv/config';

import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { db, checkDbConnection, disconnectDb } from '../../lib/db.js';

describe('Database Integration', () => {
  /**
   * Cleanup: Disconnect from database after all tests
   */
  after(async () => {
    await disconnectDb();
  });

  describe('checkDbConnection', () => {
    it('returns true when database is accessible', async () => {
      const isConnected = await checkDbConnection();
      assert.strictEqual(isConnected, true);
    });

    it('allows multiple consecutive connection checks', async () => {
      const check1 = await checkDbConnection();
      const check2 = await checkDbConnection();
      const check3 = await checkDbConnection();

      assert.strictEqual(check1, true);
      assert.strictEqual(check2, true);
      assert.strictEqual(check3, true);
    });
  });

  describe('Prisma client (db)', () => {
    it('can execute a simple query', async () => {
      const result = await db.$queryRaw<[{ result: bigint }]>`SELECT 1 as result`;
      // MySQL returns BigInt for raw SQL queries
      assert.strictEqual(result[0].result, BigInt(1));
    });

    it('can query database version', async () => {
      const result = await db.$queryRaw<[{ version: string }]>`SELECT VERSION() as version`;
      assert.ok(result[0].version);
      assert.strictEqual(typeof result[0].version, 'string');
    });

    it('has access to Person model', async () => {
      const count = await db.person.count();
      assert.strictEqual(typeof count, 'number');
      assert.ok(count >= 0);
    });

    it('has access to Application model', async () => {
      const count = await db.application.count();
      assert.strictEqual(typeof count, 'number');
      assert.ok(count >= 0);
    });

    it('has access to User model', async () => {
      const count = await db.user.count();
      assert.strictEqual(typeof count, 'number');
      assert.ok(count >= 0);
    });

    it('has access to AuditLog model', async () => {
      const count = await db.auditLog.count();
      assert.strictEqual(typeof count, 'number');
      assert.ok(count >= 0);
    });

    it('supports transactions', async () => {
      const result = await db.$transaction(async (tx) => {
        const personCount = await tx.person.count();
        const applicationCount = await tx.application.count();
        const userCount = await tx.user.count();
        return { personCount, applicationCount, userCount };
      });

      assert.strictEqual(typeof result.personCount, 'number');
      assert.strictEqual(typeof result.applicationCount, 'number');
      assert.strictEqual(typeof result.userCount, 'number');
    });
  });

  describe('Database Schema', () => {
    it('has all required tables', async () => {
      // Verify we can access all the Prisma models (which confirms tables exist)
      // This is more reliable than querying information_schema with raw SQL
      const models = [
        { name: 'person', fn: () => db.person.count() },
        { name: 'application', fn: () => db.application.count() },
        { name: 'user', fn: () => db.user.count() },
        { name: 'assessment', fn: () => db.assessment.count() },
        { name: 'interview', fn: () => db.interview.count() },
        { name: 'decision', fn: () => db.decision.count() },
        { name: 'auditLog', fn: () => db.auditLog.count() },
        { name: 'emailLog', fn: () => db.emailLog.count() },
      ];

      for (const model of models) {
        const count = await model.fn();
        assert.strictEqual(typeof count, 'number', `${model.name} table should exist and be queryable`);
      }
    });
  });
});
