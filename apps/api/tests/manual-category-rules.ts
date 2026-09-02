/** Explicit development smoke test. Creates and removes only its own empty QA workspace. */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { prisma } from '../src/config/database';
import { createCategoryRuleInputSchema } from '@bills/contracts';
import { PrismaRuleCatalog, PrismaCategoryRuleRepository, ListExpenseCategories, SaveCategoryRule,
  PrismaRuleApplications, PrismaRuleApplicationUnit, PreviewRuleApplication, ConfirmRuleApplication } from '../src/modules/categorization';
import { PrismaClassificationWriter } from '../src/modules/transactions';

async function run() {
  assert.equal(process.env.BILLS_RULES_SMOKE, '1', 'Set BILLS_RULES_SMOKE=1 explicitly. The development worker must be running.');
  const id = crypto.randomUUID();
  const name = `Codex QA categorization ${id}`;
  await prisma.workspace.create({ data: { id, name } });
  try {
    const catalog = new PrismaRuleCatalog();
    const repository = new PrismaCategoryRuleRepository();
    const save = new SaveCategoryRule(repository, new ListExpenseCategories(catalog), catalog);
    const rule = await save.execute(id, createCategoryRuleInputSchema.parse({
      matchType: 'MERCHANT', merchantKey: 'brand:uber-rides', category: 'Servicios', normalizedMerchant: 'Uber QA',
    }));
    const base = { workspaceId: id, institutionCode: 'BHD', rawMerchant: 'UBER*RIDES QA', merchant: 'Uber',
      category: 'Transporte', amount: 100, currency: 'DOP', transactionDate: new Date('2026-09-01T04:00:00Z'),
      source: 'BHD_CARD_PURCHASE', categoryOrigin: 'SYSTEM', merchantOrigin: 'SYSTEM' };
    await prisma.transaction.createMany({ data: [
      ...Array.from({ length: 255 }, (_, index) => ({ ...base, externalId: `qa-auto-${index}` })),
      { ...base, externalId: 'qa-manual', categoryOrigin: 'MANUAL', merchantOrigin: 'MANUAL' },
      { ...base, externalId: 'qa-legacy', categoryOrigin: 'LEGACY_UNKNOWN', merchantOrigin: 'LEGACY_UNKNOWN' },
      { ...base, externalId: 'qa-income', category: 'Ingresos / Transferencias', source: 'BHD_TRANSFER_INCOME' },
      { ...base, externalId: 'qa-eats', rawMerchant: 'UBER EATS QA' },
    ] });
    const store = new PrismaRuleApplications((tx) => new PrismaClassificationWriter(tx));
    const unit = new PrismaRuleApplicationUnit();
    const preview = await new PreviewRuleApplication(unit, store).execute(id, rule.id, { includeUnknown: false });
    async function wait(status: string) {
      for (let attempt = 0; attempt < 120; attempt++) {
        const result = await store.get(id, preview.id);
        if (result.status === status) return result;
        assert.notEqual(result.status, 'FAILED', 'Worker failed processing the QA job');
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      throw new Error(`Worker did not reach ${status}`);
    }
    const ready = await wait('READY');
    assert.equal(ready.matched, 257); assert.equal(ready.changes, 255);
    assert.equal(ready.protectedManual, 1); assert.equal(ready.protectedUnknown, 1);
    await new ConfirmRuleApplication(unit, store).execute(id, preview.id);
    const complete = await wait('COMPLETED');
    assert.equal(complete.applied, 255); assert.equal(complete.skipped, 0);
    assert.equal(await prisma.transaction.count({ where: { workspaceId: id, category: 'Servicios', merchant: 'Uber QA' } }), 255);
    assert.equal(await prisma.transaction.count({ where: { workspaceId: id, category: 'Transporte' } }), 3);
    const amount = await prisma.transaction.aggregate({ where: { workspaceId: id }, _sum: { amount: true } });
    assert.equal(Number(amount._sum.amount), 25900);
    assert.equal(await prisma.ruleApplicationItem.count({ where: { applicationId: preview.id, status: 'APPLIED' } }), 255);
    console.log('PASS: live worker, 2-page preview/application, exact merchants, manual/legacy protection, hidden income, audit and unchanged totals.');
  } finally {
    const workspace = await prisma.workspace.findUnique({ where: { id }, include: { _count: { select: { members: true } } } });
    assert.equal(workspace?.name, name, 'QA cleanup target changed; refusing deletion');
    assert.equal(workspace._count.members, 0, 'QA workspace has members; refusing deletion');
    await prisma.workspace.delete({ where: { id } });
    console.log('Removed only the temporary QA workspace and its synthetic records.');
  }
}
run().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
