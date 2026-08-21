export interface CategoryBreakdown {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

export interface DailyTrendItem {
  date: string;
  total: number;
  count: number;
}

export interface OrganizationBreakdown {
  organization: string;
  total: number;
  count: number;
  percentage: number;
}

export interface StatsSummary {
  period: string;
  totalAmount: number;
  totalIncome?: number;
  totalTransactions: number;
  approvedCount: number;
  rejectedCount: number;
  currency: string;
  dailyAverage: number;
  averageTicket?: number;
  comparison?: {
    previousTotalAmount: number;
    previousTotalIncome: number;
    expenseChangePercent: number | null;
    incomeChangePercent: number | null;
  };
  byCategory: CategoryBreakdown[];
  byOrganization?: OrganizationBreakdown[];
  dailyTrend: DailyTrendItem[];
}
