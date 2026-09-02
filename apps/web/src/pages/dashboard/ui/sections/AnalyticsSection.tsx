import React, { type ReactNode } from 'react';
import { FileDown } from 'lucide-react';
import type { StatsSummary } from '@/entities/stat';
import { ComparisonDetails } from '@/widgets/spending-perspective';
import { Button, Card, CardContent } from '@/shared/ui';
import type { PeriodSelection } from '@/entities/period';
import { AnalyticsBudgetCard } from './AnalyticsBudgetCard';

const CategoryBreakdownChart = React.lazy(async () => {
  const module = await import(
    '@/widgets/spending-charts'
  );
  return { default: module.CategoryBreakdownChart };
});

const DailySpendingChart = React.lazy(async () => {
  const module = await import('@/widgets/spending-charts');
  return { default: module.DailySpendingChart };
});

interface AnalyticsSectionProps {
  periodToolbar: ReactNode;
  currentPeriod: PeriodSelection;
  stats: StatsSummary | null;
  statsError: unknown;
  loadingStats: boolean;
  currency: string;
  hideBalances: boolean;
  onRefresh: () => void;
  onExport?: () => void;
}

export const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({
  periodToolbar,
  currentPeriod,
  stats,
  statsError,
  loadingStats,
  currency,
  hideBalances,
  onRefresh,
  onExport,
}) => {
  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            Entiende tus hábitos
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tendencias y categorías para tomar mejores decisiones.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {periodToolbar}
          {onExport && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 shrink-0 cursor-pointer"
              onClick={onExport}
            >
              <FileDown className="h-4 w-4 text-emerald-500" />
              <span>Exportar reporte</span>
            </Button>
          )}
        </div>
      </div>

      {statsError && !stats ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="font-semibold">No pudimos preparar la analítica</p>
            <Button onClick={onRefresh} className="mt-4">
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <React.Suspense
              fallback={
                <>
                  <div
                    className="h-72 animate-pulse rounded-2xl bg-muted"
                    data-product-tour="analytics"
                  />
                  <div className="h-72 animate-pulse rounded-2xl bg-muted" />
                </>
              }
            >
              <CategoryBreakdownChart stats={stats} currency={currency} />
              <DailySpendingChart stats={stats} currency={currency} />
            </React.Suspense>
          </div>
          {!loadingStats && (
            <ComparisonDetails
              stats={stats}
              currency={currency}
              hideBalances={hideBalances}
            />
          )}
          <AnalyticsBudgetCard period={currentPeriod} currency={currency} hideBalances={hideBalances} />
        </>
      )}
    </>
  );
};
