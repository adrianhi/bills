import { expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import crypto from 'node:crypto';
import { prisma } from '../../src/config/database';
import { PrismaRuleApplications } from '../../src/modules/categorization/infrastructure/prisma-rule-applications';
import { ProcessRuleApplication } from '../../src/modules/categorization/application/process-rule-application';
import { PrismaClassificationCandidates, PrismaClassificationWriter } from '../../src/modules/transactions';
import { PrismaTransactionWriter } from '../../src/modules/transactions/infrastructure/prisma-transaction.writer';
import { PrismaReversalService } from '../../src/modules/transactions/infrastructure/prisma-reversal.service';
import { CategorizeTransaction } from '../../src/modules/categorization/application/categorize-transaction';
import { PrismaCategoryRuleRepository } from '../../src/modules/categorization/infrastructure/prisma-category-rule.repository';
import { createTransactionInputSchema } from '@bills/contracts';

export function registerRuleIntegrationTests(app: Express, authA: Record<string, string>, authB: Record<string, string>) {
  const store = new PrismaRuleApplications((tx) => new PrismaClassificationWriter(tx));
  const worker = new ProcessRuleApplication(store, new PrismaClassificationCandidates());
  let ruleId: string;
  let workspaceId: string;
  let legacyId: string;
  let manualId: string;
  let automaticId: string;
  const period = { startDate: '2098-05-03', endDate: '2098-05-03' };
  async function drain() {
    for (let i = 0; i < 20 && await worker.processNext(); i++) { /* bounded queue drain */ }
  }
  it('supports exact rules and previews without leaking workspaces or overwriting manual fields', async () => {
    workspaceId = (await prisma.workspaceMember.findFirstOrThrow({ where: { profileId: authA['x-test-user-id'] } })).workspaceId;
    const create = await request(app).post('/api/v1/rules').set(authA).send({
      matchType: 'MERCHANT', merchantKey: 'brand:uber-rides', category: 'Servicios', normalizedMerchant: 'Uber de trabajo',
    });
    expect(create.status).toBe(201); ruleId = create.body.data.id;
    const other = await request(app).get('/api/v1/rules').set(authB);
    expect(other.body.data.some((rule: { id: string }) => rule.id === ruleId)).toBe(false);
    const base = { workspaceId, institutionCode: 'BHD', rawMerchant: 'UBER*RIDES', merchant: 'Uber', category: 'Transporte',
      amount: 100, currency: 'DOP', transactionDate: new Date('2098-05-03T04:00:00Z'), source: 'BHD_CARD_PURCHASE' };
    const [legacy, manual, automatic] = await Promise.all([
      prisma.transaction.create({ data: { ...base, externalId: crypto.randomUUID() } }),
      prisma.transaction.create({ data: { ...base, externalId: crypto.randomUUID(), categoryOrigin: 'MANUAL', merchantOrigin: 'MANUAL' } }),
      prisma.transaction.create({ data: { ...base, externalId: crypto.randomUUID(), categoryOrigin: 'SYSTEM', merchantOrigin: 'MANUAL' } }),
    ]);
    legacyId = legacy.id; manualId = manual.id; automaticId = automatic.id;
    for (const bank of ['BHD', 'QIK', 'POPULAR']) await prisma.transaction.create({ data: {
      ...base, institutionCode: bank, externalId: crypto.randomUUID(), source: `${bank}_TRANSFER_INCOME`, category: 'Ingresos / Transferencias', transactionType: 'Transferencia Recibida',
    } });
    const preview = await request(app).post(`/api/v1/rules/${ruleId}/applications/preview`).set(authA).send(period);
    expect(preview.status).toBe(202);
    expect((await request(app).patch(`/api/v1/rules/${ruleId}`).set(authA).send({ version: 1, isActive: false })).status).toBe(409);
    await drain();
    const result = await store.get(workspaceId, preview.body.data.id);
    expect(result).toMatchObject({ status: 'READY', matched: 3, changes: 1, protectedUnknown: 1, protectedManual: 2 });
    expect((await request(app).get(`/api/v1/rules/applications/${result.id}`).set(authB)).status).toBe(404);
    const totals = await prisma.transaction.aggregate({ where: { workspaceId }, _sum: { amount: true } });
    expect((await request(app).post(`/api/v1/rules/applications/${result.id}/confirm`).set(authA)).status).toBe(202);
    await drain();
    expect(await store.get(workspaceId, result.id)).toMatchObject({ status: 'COMPLETED', applied: 1 });
    expect(await prisma.transaction.findUniqueOrThrow({ where: { id: automaticId } })).toMatchObject({ category: 'Servicios', merchant: 'Uber', categoryOrigin: 'RULE' });
    expect(await prisma.transaction.findUniqueOrThrow({ where: { id: legacyId } })).toMatchObject({ category: 'Transporte', categoryOrigin: 'LEGACY_UNKNOWN' });
    const after = await prisma.transaction.aggregate({ where: { workspaceId }, _sum: { amount: true } });
    expect(after._sum.amount?.toString()).toBe(totals._sum.amount?.toString());
  });
  it('skips changes made after preview and keeps confirmation idempotent', async () => {
    const preview = await request(app).post(`/api/v1/rules/${ruleId}/applications/preview`).set(authA).send({ ...period, includeUnknown: true });
    await drain();
    const id = preview.body.data.id;
    expect(await store.get(workspaceId, id)).toMatchObject({ status: 'READY', changes: 1 });
    await request(app).patch(`/api/v1/transactions/${legacyId}`).set(authA).send({ category: 'Hogar' });
    await request(app).post(`/api/v1/rules/applications/${id}/confirm`).set(authA);
    await request(app).post(`/api/v1/rules/applications/${id}/confirm`).set(authA);
    await drain();
    expect(await store.get(workspaceId, id)).toMatchObject({ applied: 0, skipped: 1, status: 'COMPLETED' });
    expect(await prisma.transaction.findUniqueOrThrow({ where: { id: manualId } })).toMatchObject({ category: 'Transporte' });
  });
  it('rejects duplicate targets, unavailable categories and stale previews', async () => {
    const duplicate = await request(app).post('/api/v1/rules').set(authA).send({ matchType: 'MERCHANT', merchantKey: 'brand:uber-rides', category: 'Hogar' });
    expect(duplicate.status).toBe(409);
    expect((await request(app).post('/api/v1/rules').set(authA).send({ pattern: 'AB', category: 'Ingresos' })).status).toBe(400);
    const preview = await request(app).post(`/api/v1/rules/${ruleId}/applications/preview`).set(authA).send(period);
    await drain();
    expect((await request(app).patch(`/api/v1/rules/${ruleId}`).set(authA).send({ version: 1, category: 'Hogar' })).status).toBe(200);
    expect((await request(app).post(`/api/v1/rules/applications/${preview.body.data.id}/confirm`).set(authA)).status).toBe(409);
    expect((await request(app).get('/api/v1/rules')).status).toBe(401);
  });
  it('keeps manual edits and rule results during bank replay', async () => {
    const writer = new PrismaTransactionWriter(new CategorizeTransaction(new PrismaCategoryRuleRepository()), new PrismaReversalService());
    const data = createTransactionInputSchema.parse({ externalId: crypto.randomUUID(), rawMerchant: 'UBER*RIDES', merchant: 'Uber',
      category: 'Transporte', amount: 100, currency: 'DOP', transactionDate: '2098-05-03T04:00:00Z', source: 'BHD_CARD_PURCHASE', institutionCode: 'BHD', ingestionChannel: 'GMAIL_OAUTH' });
    const first = await writer.create(workspaceId, data);
    expect(first.transaction).toMatchObject({ category: 'Hogar', categoryOrigin: 'RULE' });
    await writer.update(workspaceId, first.transaction!.id, { category: 'Tecnología', merchant: 'Mi Uber' });
    const replay = await writer.create(workspaceId, data);
    expect(replay.transaction).toMatchObject({ category: 'Tecnología', merchant: 'Mi Uber', categoryOrigin: 'MANUAL' });
  });
  it('reclaims expired leases and rolls back the whole batch when a write fails', async () => {
    const preview = await request(app).post(`/api/v1/rules/${ruleId}/applications/preview`).set(authA).send(period);
    const claimed = await store.claim(); expect(claimed).not.toBeNull();
    expect(await store.claim()).toBeNull();
    await prisma.ruleApplication.update({ where: { id: claimed!.id }, data: { leaseUntil: new Date(0) } });
    const replacement = await store.claim(); expect(replacement!.leaseToken).not.toBe(claimed!.leaseToken);
    await expect(store.checkpoint(claimed!, [], 0, null, true)).rejects.toThrow('LEASE_LOST');
    await prisma.ruleApplication.update({ where: { id: replacement!.id }, data: { leaseUntil: new Date(0) } });
    await drain();
    const id = preview.body.data.id;
    await request(app).post(`/api/v1/rules/applications/${id}/confirm`).set(authA);
    const failing = new PrismaRuleApplications((tx) => ({ apply: async (...args) => {
      await new PrismaClassificationWriter(tx).apply(...args);
      throw new Error('simulated failure after write');
    } }));
    await new ProcessRuleApplication(failing, new PrismaClassificationCandidates()).processNext();
    expect(await prisma.transaction.findUniqueOrThrow({ where: { id: automaticId } })).toMatchObject({ category: 'Servicios' });
    await prisma.ruleApplication.update({ where: { id }, data: { nextAttemptAt: new Date(0) } });
    await drain();
    expect(await store.get(workspaceId, id)).toMatchObject({ status: 'COMPLETED', applied: 1 });
  });
}
