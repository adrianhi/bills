import type { CreateIncomeStreamInput, IncomeStreamDto, UpdateIncomeStreamInput } from '@bills/contracts';

export interface IncomeRepository {
  listByWorkspace(workspaceId: string): Promise<IncomeStreamDto[]>;
  getById(workspaceId: string, id: string): Promise<IncomeStreamDto | null>;
  create(workspaceId: string, input: CreateIncomeStreamInput): Promise<IncomeStreamDto>;
  update(workspaceId: string, id: string, input: UpdateIncomeStreamInput): Promise<IncomeStreamDto | null>;
  delete(workspaceId: string, id: string): Promise<boolean>;
}
