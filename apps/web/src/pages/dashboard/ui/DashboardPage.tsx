import React from 'react';
import { Navbar } from '@/widgets/navbar';
import { MetricCards } from '@/widgets/metric-summary';
import { CategoryBreakdownChart, DailySpendingChart } from '@/widgets/spending-charts';
import { TransactionTable } from '@/widgets/transactions-table';
import { EditTransactionModal } from '@/features/edit-transaction';
import { RulesManagerModal } from '@/features/manage-rules';
import type { Transaction } from '@/entities/transaction';
import type { StatsSummary } from '@/entities/stat';

interface DashboardPageProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  currency: string;
  setCurrency: (curr: string) => void;
  stats: StatsSummary | null;
  transactions: Transaction[];
  totalTransactions: number;
  loading: boolean;
  page: number;
  setPage: (page: number) => void;
  limit: number;
  search: string;
  setSearch: (s: string) => void;
  categoryFilter: string;
  setCategoryFilter: (cat: string) => void;
  statusFilter: string;
  setStatusFilter: (st: string) => void;
  organizationFilter: string;
  setOrganizationFilter: (org: string) => void;
  typeFilter: string;
  setTypeFilter: (t: string) => void;
  onResetFilters: () => void;
  onRefresh: () => void;
  onExport: () => void;
  onLock: () => void;
  editingTransaction: Transaction | null;
  setEditingTransaction: (tx: Transaction | null) => void;
  onSaveTransaction: (id: string, merchant: string, category: string, notes: string) => Promise<void>;
  isRulesModalOpen: boolean;
  setIsRulesModalOpen: (open: boolean) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  darkMode,
  setDarkMode,
  selectedMonth,
  setSelectedMonth,
  currency,
  setCurrency,
  stats,
  transactions,
  totalTransactions,
  loading,
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
  onRefresh,
  onExport,
  onLock,
  editingTransaction,
  setEditingTransaction,
  onSaveTransaction,
  isRulesModalOpen,
  setIsRulesModalOpen,
}) => {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased">
      {/* Top Navbar */}
      <Navbar
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        currency={currency}
        setCurrency={setCurrency}
        onRefresh={onRefresh}
        onOpenRules={() => setIsRulesModalOpen(true)}
        onExport={onExport}
        onLock={onLock}
        loading={loading}
      />

      {/* Main Container */}
      <main className="container mx-auto flex-1 px-4 py-6 sm:px-6 space-y-6 max-w-7xl">
        {/* 1. KPIs */}
        <MetricCards stats={stats} currency={currency} />

        {/* 2. Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CategoryBreakdownChart stats={stats} currency={currency} />
          <DailySpendingChart stats={stats} currency={currency} />
        </div>

        {/* 3. Transaction Table */}
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
          onEdit={(tx) => setEditingTransaction(tx)}
          loading={loading}
        />
      </main>

      {/* Footer */}
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        bills<span className="text-emerald-500 font-bold">.</span> • Control de Gastos Multi-Entidad & Analítica Financiera
      </footer>

      {/* Edit Modal */}
      <EditTransactionModal
        transaction={editingTransaction}
        isOpen={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
        onSave={onSaveTransaction}
      />

      {/* Rules Modal */}
      <RulesManagerModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
      />
    </div>
  );
};
