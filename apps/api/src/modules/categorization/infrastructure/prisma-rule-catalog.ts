import { prisma } from '../../../config/database';
import { visibleTransactionWhere } from '../../transactions';
import { identifyMerchant, knownMerchants } from '../domain/merchant-identity';
import { normalizeLabel } from '../../../shared/domain/normalize-label';
import type { RuleCatalogSource } from '../application/rule.ports';

export class PrismaRuleCatalog implements RuleCatalogSource {
  async categoryLabels(workspaceId: string) {
    const [transactions, rules] = await Promise.all([
      prisma.transaction.groupBy({ by: ['category'], where: { workspaceId, ...visibleTransactionWhere() } }),
      prisma.categoryRule.findMany({ where: { workspaceId }, select: { category: true } }),
    ]);
    return [...transactions, ...rules].map((item) => item.category);
  }
  async merchants(workspaceId: string, search = '', transactionId?: string) {
    if (transactionId) {
      const row = await prisma.transaction.findFirst({ where: { workspaceId, id: transactionId, ...visibleTransactionWhere() }, select: { rawMerchant: true } });
      if (!row) return [];
      const identity = identifyMerchant(row.rawMerchant);
      return [{ key: identity.key, label: identity.identityLabel }];
    }
    const result = new Map(knownMerchants().map((item) => [item.key, item]));
    let cursor: string | undefined;
    // Legacy rows have no merchant identity yet. Scan minimal columns in bounded pages.
    do {
      const rows = await prisma.transaction.findMany({
        where: { workspaceId, ...visibleTransactionWhere(), ...(cursor ? { id: { gt: cursor } } : {}) },
        select: { id: true, rawMerchant: true }, orderBy: { id: 'asc' }, take: 250,
      });
      for (const row of rows) {
        const merchant = identifyMerchant(row.rawMerchant);
        if (!search || merchant.key === search || normalizeLabel(merchant.identityLabel).includes(normalizeLabel(search))) {
          result.set(merchant.key, { key: merchant.key, label: merchant.identityLabel });
        }
      }
      cursor = rows.length === 250 ? rows.at(-1)!.id : undefined;
      if (result.size >= 100 && !search) break;
    } while (cursor);
    return [...result.values()].filter((item) => !search || item.key === search || normalizeLabel(item.label).includes(normalizeLabel(search)))
      .sort((a, b) => a.label.localeCompare(b.label, 'es')).slice(0, 100);
  }
}
