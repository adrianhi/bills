import { createCategoryRuleInputSchema, type CreateCategoryRuleInput, type UpdateCategoryRuleInput } from '@bills/contracts';
import { AppError } from '../../../errors/app-error';
import { normalizeLabel } from '../../../shared/domain/normalize-label';
import type { CategoryRuleRepository, ExpenseCategoryCatalog, RuleCatalogSource } from './rule.ports';

export class SaveCategoryRule {
  constructor(private readonly rules: CategoryRuleRepository, private readonly categories: ExpenseCategoryCatalog,
    private readonly catalog: RuleCatalogSource) {}

  async execute(workspaceId: string, input: CreateCategoryRuleInput | UpdateCategoryRuleInput, id?: string) {
    const old = id ? (await this.rules.list(workspaceId)).find((rule) => rule.id === id) : undefined;
    if (id && !old) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Regla no encontrada.');
    const parsed = createCategoryRuleInputSchema.parse({
      ...old, merchantKey: old?.matchType === 'MERCHANT' ? old.targetKey : undefined, ...input,
    });
    const category = (await this.categories.list(workspaceId)).find((item) => item.key === normalizeLabel(parsed.category));
    if (!category) throw new AppError(400, 'INVALID_CATEGORY', 'Selecciona una categoría disponible.');
    let pattern = parsed.pattern;
    let targetKey = normalizeLabel(pattern);
    if (parsed.matchType === 'MERCHANT') {
      const merchant = (await this.catalog.merchants(workspaceId, parsed.merchantKey!)).find((item) => item.key === parsed.merchantKey);
      if (!merchant && old?.targetKey !== parsed.merchantKey) throw new AppError(400, 'INVALID_MERCHANT', 'Selecciona un comercio disponible.');
      targetKey = parsed.merchantKey!;
      pattern = merchant?.label || old!.pattern;
    }
    return this.rules.save(workspaceId, {
      pattern, targetKey, matchType: parsed.matchType, category: category.label,
      normalizedMerchant: parsed.normalizedMerchant?.trim() || null,
      priority: old?.priority ?? parsed.priority, isActive: parsed.isActive,
    }, id, 'version' in input ? input.version : undefined);
  }
}
