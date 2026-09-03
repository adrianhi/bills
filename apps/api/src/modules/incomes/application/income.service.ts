import type { CreateIncomeStreamInput, UpdateIncomeStreamInput, CashFlowSummaryDto, IncomeStreamDto } from '@bills/contracts';
import type { IncomeRepository } from './income.ports';
import type { AnalyticsService } from '../../analytics';
import { projectTotalMonthlyIncome } from '../domain/income-projection';

const round = (num: number) => Math.round(num * 100) / 100;

export class IncomeService {
  constructor(
    private readonly repository: IncomeRepository,
    private readonly analyticsService: AnalyticsService,
  ) {}

  public async listStreams(workspaceId: string) {
    return this.repository.listByWorkspace(workspaceId);
  }

  public async createStream(workspaceId: string, input: CreateIncomeStreamInput) {
    return this.repository.create(workspaceId, input);
  }

  public async updateStream(workspaceId: string, id: string, input: UpdateIncomeStreamInput) {
    return this.repository.update(workspaceId, id, input);
  }

  public async deleteStream(workspaceId: string, id: string) {
    return this.repository.delete(workspaceId, id);
  }

  public async getCashFlowSummary(
    workspaceId: string,
    month?: string,
    currency = 'DOP',
  ): Promise<CashFlowSummaryDto> {
    const activeMonth = month && /^\d{4}-\d{2}$/.test(month)
      ? month
      : new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Santo_Domingo',
        year: 'numeric',
        month: '2-digit',
      }).format(new Date()).slice(0, 7);

    const stats = await this.analyticsService.getSummary(workspaceId, {
      month: activeMonth,
      currency,
    });

    const streams = await this.repository.listByWorkspace(workspaceId);
    const projectedIncome = projectTotalMonthlyIncome(streams, currency);
    const detectedIncome = Number(stats.totalIncome) || 0;
    const totalSpent = Number(stats.totalAmount) || 0;

    const totalIncome = Math.max(detectedIncome, projectedIncome);
    const netSavings = round(totalIncome - totalSpent);
    const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

    return {
      month: activeMonth,
      currency,
      detectedIncome: round(detectedIncome),
      projectedIncome: round(projectedIncome),
      totalIncome: round(totalIncome),
      totalSpent: round(totalSpent),
      netSavings,
      savingsRate,
      streamsCount: streams.filter((s: IncomeStreamDto) => s.isActive).length,
    };
  }
}
