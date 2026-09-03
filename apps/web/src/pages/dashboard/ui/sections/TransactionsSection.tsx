import React, { type ReactNode } from 'react';
import type { Transaction } from '@/entities/transaction';
import { TransactionTable } from '@/widgets/transactions-table';
import { LoadingScreen } from '@/shared/ui';

interface TransactionsSectionProps {
  periodToolbar: ReactNode;
  transactions: Transaction[];
  totalTransactions: number;
  page: number;
  setPage: (page: number) => void;
  limit: number;
  search: string;
  setSearch: (search: string) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  organizationFilter: string;
  setOrganizationFilter: (org: string) => void;
  typeFilter: string;
  setTypeFilter: (type: string) => void;
  onResetFilters: () => void;
  onEdit: (transaction: Transaction) => void;
  onExport: () => void;
  loading: boolean;
  refreshing: boolean;
  error: Error | null;
  onRetry: () => void;
  hideBalances: boolean;
  onOpenConnections: () => void;
  onAddManual: () => void;
}

export const TransactionsSection: React.FC<TransactionsSectionProps> = ({
  periodToolbar,
  transactions,
  totalTransactions,
  page,
  setPage,
  limit,
  search,
  setSearch,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  setStatusFilter,
  organizationFilter,
  setOrganizationFilter,
  typeFilter,
  setTypeFilter,
  onResetFilters,
  onEdit,
  onExport,
  loading,
  refreshing,
  error,
  onRetry,
  hideBalances,
  onOpenConnections,
  onAddManual,
}) => {
  if (loading && transactions.length === 0 && totalTransactions === 0) {
    return (
      <LoadingScreen
        message="Cargando movimientos…"
        description="Consultando tu historial de transacciones."
        fullPage
      />
    );
  }

  return (
    <>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            Todos tus movimientos
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Busca, filtra y corrige desde un solo lugar.
          </p>
        </div>
        {periodToolbar}
      </div>
      <TransactionTable
        transactions={transactions}
        total={totalTransactions}
        page={page}
        setPage={setPage}
        limit={limit}
        search={search}
        setSearch={setSearch}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        organizationFilter={organizationFilter}
        setOrganizationFilter={setOrganizationFilter}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        onResetFilters={onResetFilters}
        onEdit={onEdit}
        onExport={onExport}
        loading={loading}
        refreshing={refreshing}
        error={error}
        onRetry={onRetry}
        hideBalances={hideBalances}
        onOpenConnections={onOpenConnections}
        onAddManual={onAddManual}
      />
    </>
  );
};
