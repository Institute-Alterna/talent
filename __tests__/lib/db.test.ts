/**
 * Database Utilities Unit Tests
 *
 * Unit tests for pure utility functions in lib/db-utils.ts
 *
 * These tests verify:
 * - URL parsing for MySQL connection strings
 * - Correct handling of various URL formats
 * - Edge cases and error conditions
 *
 * Note: These are unit tests that don't require a database connection.
 * We import from db-utils.ts directly to avoid Prisma dependencies,
 * making these tests fast and isolated.
 *
 * Integration tests that verify actual database connectivity are in
 * __tests__/lib/db.integration.test.ts
 */

import { parseDbUrl } from '@/lib/db-utils';

describe('parseDbUrl', () => {
  /**
   * Test: Standard MySQL URL parsing
   *
   * The most common format: mysql://user:password@host:port/database
   */
  it('parses a standard MySQL connection URL', () => {
    const url = 'mysql://admin:secret123@localhost:3306/myapp';
    const result = parseDbUrl(url);

    expect(result).toEqual({
      host: 'localhost',
      port: 3306,
      user: 'admin',
      password: 'secret123',
      database: 'myapp',
    });
  });

  /**
   * Test: URL with special characters in password
   *
   * Passwords often contain special characters that need URL encoding.
   * The URL parser should decode them correctly.
   */
  it('handles URL-encoded special characters in password', () => {
    // Password: p@ss%word! (encoded as p%40ss%25word%21)
    const url = 'mysql://user:p%40ss%25word%21@db.example.com:3306/testdb';
    const result = parseDbUrl(url);

    expect(result.user).toBe('user');
    expect(result.password).toBe('p@ss%word!');
    expect(result.host).toBe('db.example.com');
    expect(result.database).toBe('testdb');
  });

  /**
   * Test: Default port when not specified
   *
   * MySQL's default port is 3306. If the URL doesn't specify a port,
   * we should default to it.
   */
  it('defaults to port 3306 when port is not specified', () => {
    const url = 'mysql://user:pass@localhost/mydb';
    const result = parseDbUrl(url);

    expect(result.port).toBe(3306);
  });

  /**
   * Test: Non-standard port
   *
   * Some MySQL installations use different ports (e.g., 3307, 3308).
   */
  it('parses non-standard port correctly', () => {
    const url = 'mysql://user:pass@localhost:3307/mydb';
    const result = parseDbUrl(url);

    expect(result.port).toBe(3307);
  });

  /**
   * Test: Remote hostname (Dreamhost-style)
   *
   * This is similar to the actual Dreamhost MySQL hostname format.
   */
  it('parses remote hostname correctly', () => {
    const url = 'mysql://dbuser:password@mysql.dreamhost.com:3306/alterna_talent';
    const result = parseDbUrl(url);

    expect(result.host).toBe('mysql.dreamhost.com');
    expect(result.database).toBe('alterna_talent');
  });

  /**
   * Test: Complex subdomain hostname
   *
   * Dreamhost uses complex hostnames like ducote.iad1-mysql-e2-5b.dreamhost.com
   */
  it('parses complex subdomain hostnames', () => {
    const url = 'mysql://user:pass@server.region-mysql-cluster.dreamhost.com:3306/mydb';
    const result = parseDbUrl(url);

    expect(result.host).toBe('server.region-mysql-cluster.dreamhost.com');
  });

  /**
   * Test: Database name with underscores
   *
   * Database names often contain underscores (e.g., alterna_talent_dev).
   */
  it('handles database names with underscores', () => {
    const url = 'mysql://user:pass@localhost:3306/alterna_talent_dev';
    const result = parseDbUrl(url);

    expect(result.database).toBe('alterna_talent_dev');
  });

  /**
   * Test: Empty password
   *
   * Some local development setups have no password.
   */
  it('handles empty password', () => {
    const url = 'mysql://root:@localhost:3306/test';
    const result = parseDbUrl(url);

    expect(result.user).toBe('root');
    expect(result.password).toBe('');
  });

  /**
   * Test: Malformed URL throws error
   *
   * Invalid URLs should throw an error, not silently fail.
   */
  it('throws error for malformed URL', () => {
    expect(() => parseDbUrl('not-a-valid-url')).toThrow();
  });

  /**
   * Test: Completely invalid URL throws error
   *
   * URLs that can't be parsed at all should throw an error.
   * Note: JavaScript's URL class is lenient - 'localhost:3306' is treated
   * as having 'localhost:' as the protocol. So we use a truly invalid string.
   */
  it('throws error for completely invalid URL', () => {
    expect(() => parseDbUrl('')).toThrow();
    expect(() => parseDbUrl('   ')).toThrow();
  });

  /**
   * Test: Numeric port parsing
   *
   * Ensure port is returned as a number, not a string.
   */
  it('returns port as a number, not a string', () => {
    const url = 'mysql://user:pass@localhost:3306/mydb';
    const result = parseDbUrl(url);

    expect(typeof result.port).toBe('number');
    expect(result.port).toBe(3306);
  });
});
