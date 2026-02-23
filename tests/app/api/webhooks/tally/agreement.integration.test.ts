/**
 * Agreement Webhook Integration Tests
 *
 * End-to-end tests for the agreement signing webhook flow.
 * Requires a database connection.
 *
 * @jest-environment node
 */

import { POST } from '@/app/api/webhooks/tally/agreement/route';
import { NextRequest } from 'next/server';
import { createAgreementPayload, generateWebhookSignature } from '@/tests/fixtures/tally-webhooks';
import { db } from '@/lib/db';
import { clearAllRateLimits } from '@/lib/webhooks';

// Only run if DATABASE_URL is set (integration environment)
const describeFn = process.env.DATABASE_URL ? describe : describe.skip;

describeFn('Agreement Webhook Integration', () => {
  const webhookSecret = 'integration-test-secret';
  let testPersonId: string;
  let testApplicationId: string;

  beforeAll(async () => {
    process.env.WEBHOOK_SECRET = webhookSecret;

    // Create test person
    const person = await db.person.create({
      data: {
        email: `agreement-test-${Date.now()}@example.com`,
        firstName: 'Agreement',
        lastName: 'Test',
        generalCompetenciesCompleted: true,
        generalCompetenciesScore: 85,
      },
    });
    testPersonId = person.id;

    // Create test application in AGREEMENT stage with ACCEPTED status
    const application = await db.application.create({
      data: {
        personId: testPersonId,
        position: 'Software Developer',
        currentStage: 'AGREEMENT',
        status: 'ACCEPTED',
        tallySubmissionId: `test-app-sub-${Date.now()}`,
      },
    });
    testApplicationId = application.id;
  });

  beforeEach(() => {
    clearAllRateLimits();
  });

  afterAll(async () => {
    // Clean up test data
    if (testApplicationId) {
      await db.auditLog.deleteMany({ where: { applicationId: testApplicationId } });
      await db.application.delete({ where: { id: testApplicationId } }).catch(() => {});
    }
    if (testPersonId) {
      await db.auditLog.deleteMany({ where: { personId: testPersonId } });
      await db.person.delete({ where: { id: testPersonId } }).catch(() => {});
    }
  });

  function createRequest(payload: unknown, secret?: string): NextRequest {
    const body = JSON.stringify(payload);
    const headers = new Headers({
      'content-type': 'application/json',
      'x-forwarded-for': '192.168.1.1',
    });
    if (secret) {
      headers.set('x-webhook-secret', secret);
    }
    return new NextRequest('http://localhost/api/webhooks/tally/agreement', {
      method: 'POST',
      headers,
      body,
    });
  }

  it('processes agreement webhook end-to-end', async () => {
    const payload = createAgreementPayload({
      applicationId: testApplicationId,
      legalFirstName: 'Agreement',
      legalLastName: 'Test',
    });
    const signature = generateWebhookSignature(payload, webhookSecret);

    const request = createRequest(payload, signature);
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.currentStage).toBe('SIGNED');

    // Verify DB was updated
    const updatedApp = await db.application.findUnique({
      where: { id: testApplicationId },
    });

    expect(updatedApp).not.toBeNull();
    expect(updatedApp!.currentStage).toBe('SIGNED');
    expect(updatedApp!.agreementSignedAt).not.toBeNull();
    expect(updatedApp!.agreementTallySubmissionId).not.toBeNull();
    expect(updatedApp!.agreementData).not.toBeNull();
  });
});
