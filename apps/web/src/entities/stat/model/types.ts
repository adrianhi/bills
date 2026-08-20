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

export interface StatsSummary {
  period: string;
  totalAmount: number;
  totalTransactions: number;
  approvedCount: number;
  rejectedCount: number;
  currency: string;
  dailyAverage: number;
  byCategory: CategoryBreakdown[];
  dailyTrend: DailyTrendItem[];
}
