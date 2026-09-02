import type { ExpenseCategoryDto, RuleMerchantDto } from '@bills/contracts';
import type { RuleRecord } from '../domain/rule-matcher';

export interface RuleWrite {
  pattern: string; targetKey: string; matchType: string; normalizedMerchant: string | null;
  category: string; priority: number; isActive: boolean;
}
export interface CategoryRuleRepository {
  list(workspaceId: string): Promise<RuleRecord[]>;
  save(workspaceId: string, input: RuleWrite, id?: string, version?: number): Promise<RuleRecord>;
  remove(workspaceId: string, id: string): Promise<void>;
  exportForWorkspaces(workspaceIds: string[]): Promise<unknown[]>;
}
export interface ExpenseCategoryCatalog {
  list(workspaceId: string): Promise<ExpenseCategoryDto[]>;
}
export interface RuleCatalogSource {
  categoryLabels(workspaceId: string): Promise<string[]>;
  merchants(workspaceId: string, search: string, transactionId?: string): Promise<RuleMerchantDto[]>;
}
