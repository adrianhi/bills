import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';

const integrationDescribe =
  process.env.TEST_DATABASE_URL && process.env.DATABASE_URL === process.env.TEST_DATABASE_URL
    ? describe
    : describe.skip;

const app = createApp();
const userA = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'ana@bills.test',
  name: 'Ana',
};
const userB = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'bruno@bills.test',
  name: 'Bruno',
};

function auth(user: typeof userA) {
  return {
    'x-test-user-id': user.id,
    'x-test-user-email': user.email,
    'x-test-user-name': user.name,
  };
}

async function cleanDatabase() {
  await prisma.integrationConsent.deleteMany();
  await prisma.legalAcceptance.deleteMany();
  await prisma.oAuthState.deleteMany();
  await prisma.ingestionEvent.deleteMany();
  await prisma.bankConnection.deleteMany();
  await prisma.inboxConnection.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.categoryRule.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.betaInvite.deleteMany();
  await prisma.financialInstitution.deleteMany();
  await prisma.legalDocument.deleteMany();
  await prisma.accountDeletionAudit.deleteMany();
}

async function acceptCurrentLegalDocuments(user: typeof userA) {
  const current = await request(app).get('/api/v1/legal/me/current').set(auth(user));
  expect(current.status).toBe(200);
  const documents = current.body.data
    .filter((document: { required: boolean }) => document.required)
    .map((document: { type: string; version: string }) => ({
      type: document.type,
      version: document.version,
    }));
  const accepted = await request(app)
    .post('/api/v1/legal/accept')
    .set(auth(user))
    .send({ documents, source: 'SIGNUP', locale: 'es-DO' });
  expect(accepted.status).toBe(200);
}

integrationDescribe('SaaS API integration and tenant isolation', () => {
  let transactionAId = '';

  beforeAll(async () => {
    await cleanDatabase();
    await prisma.financialInstitution.createMany({
      data: [
        { code: 'BHD', displayName: 'Banco BHD', status: 'PILOT' },
        { code: 'CASH', displayName: 'Manual / Efectivo', status: 'ACTIVE' },
      ],
    });
    await prisma.betaInvite.createMany({
      data: [{ email: userA.email }, { email: userB.email }],
    });

    for (const user of [userA, userB]) {
      const bootstrap = await request(app).post('/api/v1/me/bootstrap').set(auth(user));
      expect(bootstrap.status).toBe(200);
      expect(bootstrap.body.data.legalAcceptanceRequired).toBe(true);
    }

    const blockedBeforeAcceptance = await request(app).get('/api/v1/transactions').set(auth(userA));
    expect(blockedBeforeAcceptance.status).toBe(428);
    expect(blockedBeforeAcceptance.body.error.code).toBe('LEGAL_ACCEPTANCE_REQUIRED');

    await acceptCurrentLegalDocuments(userA);
    await acceptCurrentLegalDocuments(userB);

    const payload = {
      externalId: 'shared-bank-id-001',
      rawMerchant: 'SM BRAVO LAS AMERICAS',
      amount: 1530,
      currency: 'DOP',
      transactionDate: '2026-08-18T19:14:00.000Z',
      institutionCode: 'BHD',
      ingestionChannel: 'EMAIL_FORWARD',
    };
    const createdA = await request(app).post('/api/v1/transactions').set(auth(userA)).send(payload);
    const createdB = await request(app).post('/api/v1/transactions').set(auth(userB)).send(payload);
    expect(createdA.status).toBe(201);
    expect(createdB.status).toBe(201);
    transactionAId = createdA.body.data.id;
  });

  afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
  });

  it('serves the unauthenticated health check', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
  });

  it('publishes legal documents without requiring a session', async () => {
    const response = await request(app).get('/api/v1/legal/current');
    expect(response.status).toBe(200);
    expect(response.body.data.some((document: { type: string }) => document.type === 'TERMS')).toBe(true);
    expect(response.body.data.some((document: { type: string }) => document.type === 'PRIVACY')).toBe(true);
  });

  it('rejects transaction access without a Supabase session', async () => {
    const response = await request(app).get('/api/v1/transactions');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('allows the same bank external ID in separate workspaces', async () => {
    const [responseA, responseB] = await Promise.all([
      request(app).get('/api/v1/transactions').set(auth(userA)),
      request(app).get('/api/v1/transactions').set(auth(userB)),
    ]);
    expect(responseA.status).toBe(200);
    expect(responseB.status).toBe(200);
    expect(responseA.body.data).toHaveLength(1);
    expect(responseB.body.data).toHaveLength(1);
    expect(responseA.body.data[0].externalId).toBe('shared-bank-id-001');
    expect(responseB.body.data[0].externalId).toBe('shared-bank-id-001');
    expect(responseA.body.data[0].id).not.toBe(responseB.body.data[0].id);
  });

  it('does not expose another workspace transaction by ID', async () => {
    const response = await request(app)
      .get(`/api/v1/transactions/${transactionAId}`)
      .set(auth(userB));
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND');
  });

  it('does not allow another workspace to mutate or delete a transaction', async () => {
    const update = await request(app)
      .patch(`/api/v1/transactions/${transactionAId}`)
      .set(auth(userB))
      .send({ category: 'Intento cruzado' });
    const removal = await request(app)
      .delete(`/api/v1/transactions/${transactionAId}`)
      .set(auth(userB));
    expect(update.status).toBe(404);
    expect(removal.status).toBe(404);

    const ownerRead = await request(app)
      .get(`/api/v1/transactions/${transactionAId}`)
      .set(auth(userA));
    expect(ownerRead.status).toBe(200);
    expect(ownerRead.body.data.category).toBe('Supermercado');
  });

  it('persists onboarding completion for the authenticated profile', async () => {
    const completed = await request(app)
      .post('/api/v1/me/onboarding/complete')
      .set(auth(userA));
    expect(completed.status).toBe(200);
    expect(completed.body.data.onboardingComplete).toBe(true);

    const bootstrap = await request(app).post('/api/v1/me/bootstrap').set(auth(userA));
    expect(bootstrap.status).toBe(200);
    expect(bootstrap.body.data.onboardingComplete).toBe(true);
  });

  it('exports only the authenticated profile data and excludes encrypted secrets', async () => {
    const response = await request(app).post('/api/v1/me/data-export').set(auth(userA));
    expect(response.status).toBe(200);
    expect(response.body.data.profile.email).toBe(userA.email);
    expect(JSON.stringify(response.body)).not.toContain('encryptedAccessToken');
    expect(JSON.stringify(response.body)).not.toContain('rawContent');
  });

  it('deletes a personal account and retains only a pseudonymous completion audit', async () => {
    const userC = {
      id: '33333333-3333-4333-8333-333333333333',
      email: 'carla@bills.test',
      name: 'Carla',
    };
    await prisma.betaInvite.create({ data: { email: userC.email } });
    expect((await request(app).post('/api/v1/me/bootstrap').set(auth(userC))).status).toBe(200);
    const response = await request(app)
      .delete('/api/v1/me')
      .set(auth(userC))
      .send({ confirmation: 'DELETE_MY_ACCOUNT' });
    expect(response.status).toBe(200);
    expect(await prisma.profile.findUnique({ where: { id: userC.id } })).toBeNull();
    expect(await prisma.accountDeletionAudit.count()).toBe(1);
  });
});
