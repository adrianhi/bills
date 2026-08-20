export interface Transaction {
  id: string;
  externalId: string;
  cardLast4?: string | null;
  cardType?: string | null;
  rawMerchant: string;
  merchant: string;
  category: string;
  amount: number;
  currency: string;
  status: string;
  transactionType: string;
  transactionDate: string;
  source: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StatsSummary {
  period: {
    month?: string;
    startDate?: string;
    endDate?: string;
  };
  totalAmount: number;
  totalTransactions: number;
  approvedCount: number;
  rejectedCount: number;
  currency: string;
  avgTransaction: number;
  dailyAverage: number;
  byCategory: Array<{
    category: string;
    total: number;
    count: number;
    percentage: number;
  }>;
  byMerchant: Array<{
    merchant: string;
    total: number;
    count: number;
  }>;
  dailyTrend: Array<{
    date: string;
    total: number;
    count: number;
  }>;
}

export interface CategoryRule {
  id: string;
  pattern: string;
  normalizedMerchant: string;
  category: string;
  priority: number;
  isActive: boolean;
}
