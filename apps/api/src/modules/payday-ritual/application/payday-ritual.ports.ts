export interface PaydayIncomeReader {
  plannedBiweeklyIncome(workspaceId: string, currency: string): Promise<number>;
}

export interface PaydayExpenseReader {
  summarizeCycle(workspaceId: string, currency: string, start: string, through: string): Promise<{
    paidFixed: number;
    otherSpent: number;
  }>;
}

export interface PaydayCommitmentReader {
  sumFutureThrough(workspaceId: string, currency: string, after: string, through: string): Promise<number>;
}

export interface PaydayReviewRepository {
  completedAt(workspaceId: string, profileId: string, cycleKey: string): Promise<Date | null>;
  complete(workspaceId: string, profileId: string, cycleKey: string): Promise<Date>;
}

export interface PaydayActionRecorder {
  recordAction(input: {
    workspaceId: string; profileId: string; name: string; contextKey: string;
    properties?: Record<string, string | number | boolean>;
  }): Promise<void>;
}
