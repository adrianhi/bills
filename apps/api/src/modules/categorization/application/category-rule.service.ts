import type { CreateCategoryRuleInput, UpdateCategoryRuleInput } from '@bills/contracts';
import type { CategoryRuleRepository, ExpenseCategoryCatalog, RuleCatalogSource } from './rule.ports';
import type { SaveCategoryRule } from './save-category-rule';

export class CategoryRuleApplicationService {
  constructor(private readonly repository: CategoryRuleRepository, private readonly save: SaveCategoryRule,
    readonly categories: ExpenseCategoryCatalog, readonly catalog: RuleCatalogSource) {}
  list(workspaceId: string) { return this.repository.list(workspaceId); }
  create(workspaceId: string, input: CreateCategoryRuleInput) { return this.save.execute(workspaceId, input); }
  update(workspaceId: string, id: string, input: UpdateCategoryRuleInput) { return this.save.execute(workspaceId, input, id); }
  remove(workspaceId: string, id: string) { return this.repository.remove(workspaceId, id); }
}
