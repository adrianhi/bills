import React, { type ReactNode } from 'react';
import type { InboxConnection } from '@/entities/connection';
import type { StatsSummary } from '@/entities/stat';
import type { Transaction } from '@/entities/transaction';
import { MetricCards } from '@/widgets/metric-summary';
import { MonthPerspectiveCard } from '@/widgets/spending-perspective';
import { Button, Card, CardContent } from '@/shared/ui';
import { ConnectionHealthCard } from '../ConnectionHealthCard';
import { RecentTransactionsCard } from './RecentTransactionsCard';
import { CurrentBudgetCard } from './CurrentBudgetCard';

interface HomeSectionProps {
  periodToolbar: ReactNode;
  primaryConnection?: InboxConnection;
  connectionsLoading: boolean;
  connectionsFailed: boolean;
  onOpenConnections: () => void;
  stats: StatsSummary | null;
  statsError: unknown;
  loadingStats: boolean;
  currency: string;
  hideBalances: boolean;
  onRefresh: () => void;
  transactions: Transaction[];
  loadingTransactions: boolean;
  onViewAllTransactions: () => void;
  onSelectTransaction: (transaction: Transaction) => void;
  onAddManual: () => void;
}

function LoadingSummaryCards() {
  return (
    <div
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      aria-label="Cargando resumen"
    >
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="h-32 animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  );
}

export const HomeSection: React.FC<HomeSectionProps> = ({
  periodToolbar,
  primaryConnection,
  connectionsLoading,
  connectionsFailed,
  onOpenConnections,
  stats,
  statsError,
  loadingStats,
  currency,
  hideBalances,
  onRefresh,
  transactions,
  loadingTransactions,
  onViewAllTransactions,
  onSelectTransaction,
  onAddManual,
}) => {
  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            Tu panorama
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Lo importante de este período, sin sobrecargarte.
          </p>
        </div>
        {periodToolbar}
      </div>

      <ConnectionHealthCard
        connection={primaryConnection}
        loading={connectionsLoading}
        failed={connectionsFailed}
        onOpenConnections={onOpenConnections}
      />

      {statsError && !stats ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-5">
            <p className="font-semibold">No pudimos cargar el resumen</p>
            <p className="text-sm text-muted-foreground">
              Los movimientos no se han perdido. Puedes volver a intentarlo.
            </p>
            <Button onClick={onRefresh}>Reintentar</Button>
          </CardContent>
        </Card>
      ) : loadingStats ? (
        <LoadingSummaryCards />
      ) : (
        <MetricCards
          stats={stats}
          currency={currency}
          hideBalances={hideBalances}
        />
      )}

      {!loadingStats && (
        <MonthPerspectiveCard
          stats={stats}
          currency={currency}
          hideBalances={hideBalances}
        />
      )}

      <CurrentBudgetCard currency={currency} hideBalances={hideBalances} />

      <RecentTransactionsCard
        transactions={transactions}
        loading={loadingTransactions}
        hideBalances={hideBalances}
        onViewAll={onViewAllTransactions}
        onSelectTransaction={onSelectTransaction}
        onOpenConnections={onOpenConnections}
        onAddManual={onAddManual}
      />
    </>
  );
};
