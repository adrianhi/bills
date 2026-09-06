export interface SafeToSpendExpenseReader {
  summarize(workspaceId: string, currency: string, today: string): Promise<{
    spentBeforeToday: number;
    spentToday: number;
  }>;
}

export interface ConfirmedCommitmentReader {
  sumFutureThroughMonthEnd(
    workspaceId: string,
    currency: string,
    today: string,
  ): Promise<number>;
}

export class NoConfirmedCommitments implements ConfirmedCommitmentReader {
  async sumFutureThroughMonthEnd(): Promise<number> { return 0; }
}
