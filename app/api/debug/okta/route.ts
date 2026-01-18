/**
 * Debug API Route for Okta Connection
 *
 * This endpoint tests the Okta API connection and group membership.
 * ONLY available in development mode.
 *
 * GET /api/debug/okta
 */

import { NextResponse } from 'next/server';
import {
  isOktaConfigured,
  testOktaConnection,
  getAdminGroupMembers,
  getUserGroupMembers,
  getTalentAppUsers,
} from '@/lib/integrations/okta';

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }

  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: {
      OKTA_DOMAIN: process.env.OKTA_DOMAIN ? '✓ set' : '✗ missing',
      OKTA_API_TOKEN: process.env.OKTA_API_TOKEN ? '✓ set' : '✗ missing',
      OKTA_CLIENT_ID: process.env.OKTA_CLIENT_ID ? '✓ set' : '✗ missing',
      OKTA_CLIENT_SECRET: process.env.OKTA_CLIENT_SECRET ? '✓ set' : '✗ missing',
      OKTA_ISSUER: process.env.OKTA_ISSUER ? '✓ set' : '✗ missing',
      OKTA_USER_GROUP_ID: process.env.OKTA_USER_GROUP_ID || '✗ missing',
      ADMIN_OKTA_GROUP_ID: process.env.ADMIN_OKTA_GROUP_ID || '✗ missing',
    },
    isOktaConfigured: isOktaConfigured(),
  };

  // Test connection
  try {
    diagnostics.connectionTest = await testOktaConnection();
  } catch (error) {
    diagnostics.connectionTest = false;
    diagnostics.connectionError = error instanceof Error ? error.message : String(error);
  }

  // Get admin group members (talent-administration)
  try {
    const adminIds = await getAdminGroupMembers();
    diagnostics.adminGroup = {
      name: 'talent-administration',
      id: process.env.ADMIN_OKTA_GROUP_ID,
      memberCount: adminIds.length,
      memberIds: adminIds,
    };
  } catch (error) {
    diagnostics.adminGroupError = error instanceof Error ? error.message : String(error);
  }

  // Get user group members (talent-access)
  try {
    const userIds = await getUserGroupMembers();
    diagnostics.userGroup = {
      name: 'talent-access',
      id: process.env.OKTA_USER_GROUP_ID,
      memberCount: userIds.length,
      memberIds: userIds,
    };
  } catch (error) {
    diagnostics.userGroupError = error instanceof Error ? error.message : String(error);
  }

  // Get users who have access to the Talent app
  try {
    const appUsers = await getTalentAppUsers();
    diagnostics.talentAppUsers = appUsers.map((u) => ({
      id: u.oktaUserId,
      email: u.email,
      displayName: u.displayName,
      isAdmin: u.isAdmin,
      status: u.oktaStatus,
    }));
  } catch (error) {
    diagnostics.talentAppUsersError = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json(diagnostics, { status: 200 });
}
