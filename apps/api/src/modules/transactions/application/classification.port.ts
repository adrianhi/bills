export interface ClassificationCandidate {
  id: string; rawMerchant: string; merchant: string; category: string;
  categoryOrigin: string; merchantOrigin: string; classificationVersion: number;
}
export interface ClassificationChange {
  merchant: string; category: string; changeMerchant: boolean; changeCategory: boolean;
  merchantKey: string; merchantIdentityLabel: string;
}
export interface ClassificationWriter {
  apply(workspaceId: string, transactionId: string, version: number, change: ClassificationChange,
    ruleId: string, includeUnknown: boolean): Promise<boolean>;
  applyMany?(workspaceId: string, changes: { id: string; version: number; change: ClassificationChange }[],
    ruleId: string, includeUnknown: boolean): Promise<string[]>;
}
export interface ClassificationCandidates {
  page(input: { workspaceId: string; cutoff: Date; startDate: Date | null; endDate: Date | null; cursor: string | null }): Promise<ClassificationCandidate[]>;
}
