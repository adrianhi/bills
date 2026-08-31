import React, { type ReactNode } from 'react';
import type { StatsSummary } from '@/entities/stat';
import { ComparisonDetails } from '@/widgets/spending-perspective';
import { Button, Card, CardContent } from '@/shared/ui';

const CategoryBreakdownChart = React.lazy(async () => {
  const module = await import(
    '@/widgets/spending-charts/ui/CategoryBreakdownChart'
  );
  return { default: module.CategoryBreakdownChart };
});

const DailySpendingChart = React.lazy(async () => {
  const module = await import('@/widgets/spending-charts/ui/DailySpendingChart');
  return { default: module.DailySpendingChart };
});

interface AnalyticsSectionProps {
  periodToolbar: ReactNode;
  stats: StatsSummary | null;
  statsError: unknown;
  loadingStats: boolean;
  currency: string;
  hideBalances: boolean;
  onRefresh: () => void;
}

export const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({
  periodToolbar,
  stats,
  statsError,
  loadingStats,
  currency,
  hideBalances,
  onRefresh,
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
        {periodToolbar}
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
        </>
      )}
    </>
  );
};
