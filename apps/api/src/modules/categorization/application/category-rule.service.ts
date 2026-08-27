import type { CreateCategoryRuleInput } from '../../../schemas/transaction.schema';
import { AppError } from '../../../errors/app-error';
import { PrismaCategoryRuleRepository } from '../infrastructure/prisma-category-rule.repository';

export class CategoryRuleApplicationService {
  constructor(private readonly repository: PrismaCategoryRuleRepository) {}
  list(workspaceId: string) { return this.repository.list(workspaceId); }
  create(workspaceId: string, input: CreateCategoryRuleInput) { return this.repository.create(workspaceId, input); }
  async remove(workspaceId: string, id: string) {
    const result = await this.repository.remove(workspaceId, id);
    if (!result.count) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Rule not found');
  }
}
