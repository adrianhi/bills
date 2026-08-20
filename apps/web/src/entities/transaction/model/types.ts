export interface Transaction {
  id: string;
  externalId: string;
  cardLast4: string | null;
  cardType: string | null;
  rawMerchant: string;
  merchant: string;
  amount: number;
  currency: string;
  status: string;
  transactionType: string;
  category: string;
  notes?: string | null;
  transactionDate: string;
  createdAt: string;
}

export interface CategoryRule {
  id: string;
  pattern: string;
  normalizedMerchant: string;
  category: string;
  priority: number;
}
