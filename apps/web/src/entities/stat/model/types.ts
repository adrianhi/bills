import type { StatsSummaryDto } from '@bills/contracts';

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

export type StatsSummary = StatsSummaryDto;
