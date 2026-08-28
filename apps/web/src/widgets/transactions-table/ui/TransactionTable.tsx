import { useState } from 'react';
import { Layers } from 'lucide-react';
import type { Transaction } from '@/entities/transaction';
import {
  groupTransactionsByDate,
  isAtmWithdrawal,
  isReceivedTransfer,
  isSentTransfer,
  isServicePayment,
} from '@/entities/transaction/model/selectors';
import { FilterDrawer } from '@/features/filter-drawer';
import { Card, CardContent } from '@/shared/ui';
import { TransactionDesktopTable } from './TransactionDesktopTable';
import { TransactionMobileList } from './TransactionMobileList';
import { TransactionPagination } from './TransactionPagination';
import { TransactionTableHeader, type TransactionFilterState } from './TransactionTableHeader';

interface TransactionTableProps {
  transactions: Transaction[];
  total: number;
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
  setOrganizationFilter: (organization: string) => void;
  typeFilter: string;
  setTypeFilter: (type: string) => void;
  onResetFilters: () => void;
  onEdit: (transaction: Transaction) => void;
  onExport?: () => void;
  loading: boolean;
  hideBalances?: boolean;
}

const matchesType = (transaction: Transaction, type: string) => {
  if (!type) return true;
  if (type === 'recibida') return isReceivedTransfer(transaction);
  if (type === 'enviada') return isSentTransfer(transaction);
  if (type === 'servicio') return isServicePayment(transaction);
  if (type === 'retiro') return isAtmWithdrawal(transaction);
  if (type === 'compra') return !isReceivedTransfer(transaction) && !isSentTransfer(transaction) && !isServicePayment(transaction) && !isAtmWithdrawal(transaction);
  return true;
};

export const TransactionTable = ({
  transactions, total, page, setPage, limit, search, setSearch, categoryFilter,
  setCategoryFilter, statusFilter, setStatusFilter, organizationFilter,
  setOrganizationFilter, typeFilter, setTypeFilter, onResetFilters, onEdit,
  onExport, loading, hideBalances = false,
}: TransactionTableProps) => {
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const totalPages = Math.ceil(total / limit) || 1;
  const filteredTransactions = transactions.filter((transaction) => matchesType(transaction, typeFilter));
  const groups = groupTransactionsByDate(filteredTransactions);
  const filters: TransactionFilterState = { search, category: categoryFilter, status: statusFilter, organization: organizationFilter, type: typeFilter };
  const updateFilter = (filter: keyof TransactionFilterState, value: string) => {
    const setters: Record<keyof TransactionFilterState, (next: string) => void> = {
      search: setSearch,
      category: setCategoryFilter,
      status: setStatusFilter,
      organization: setOrganizationFilter,
      type: setTypeFilter,
    };
    setters[filter](value);
    setPage(1);
  };

  return (
    <Card className="overflow-hidden border-border/60 shadow-sm">
      <TransactionTableHeader total={total} filters={filters} onFilterChange={updateFilter} onReset={onResetFilters} onOpenFilters={() => setIsFilterDrawerOpen(true)} />
      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        organizationFilter={organizationFilter}
        setOrganizationFilter={(value) => updateFilter('organization', value)}
        typeFilter={typeFilter}
        setTypeFilter={(value) => updateFilter('type', value)}
        categoryFilter={categoryFilter}
        setCategoryFilter={(value) => updateFilter('category', value)}
        statusFilter={statusFilter}
        setStatusFilter={(value) => updateFilter('status', value)}
        onResetFilters={onResetFilters}
        totalResults={total}
        onExport={onExport}
      />
      <CardContent className="p-0">
        {loading ? <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Cargando transacciones...</div>
          : filteredTransactions.length === 0 ? <div className="flex h-64 flex-col items-center justify-center p-6 text-center text-muted-foreground"><Layers className="mb-2 h-10 w-10 opacity-30" /><p className="text-sm font-semibold">No se encontraron transacciones</p><p className="mt-1 text-xs">Prueba cambiando el mes o los filtros de búsqueda.</p></div>
            : <><TransactionMobileList groups={groups} hideBalances={hideBalances} onEdit={onEdit} /><TransactionDesktopTable groups={groups} hideBalances={hideBalances} onEdit={onEdit} /></>}
      </CardContent>
      <TransactionPagination page={page} total={total} totalPages={totalPages} onPageChange={setPage} />
    </Card>
  );
};
