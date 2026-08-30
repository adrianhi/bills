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
import { Button, Card, CardContent, SafeDiagnosticButton } from '@/shared/ui';
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
  refreshing?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  hideBalances?: boolean;
  onOpenConnections?: () => void;
  onAddManual?: () => void;
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
  onExport, loading, refreshing = false, error, onRetry, hideBalances = false,
  onOpenConnections, onAddManual,
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
    <Card className="relative overflow-hidden border-border/60 shadow-sm">
      {refreshing && (
        <div className="absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden bg-primary/15" aria-label="Actualizando movimientos">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
        </div>
      )}
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
        {loading ? <div className="space-y-3 p-4" aria-label="Cargando movimientos">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div>
          : error && transactions.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center"><p className="text-sm font-semibold">No pudimos cargar tus movimientos</p><p className="max-w-sm text-xs text-muted-foreground">Tus datos siguen seguros. Revisa tu conexión e inténtalo otra vez.</p><div className="flex flex-wrap justify-center gap-2">{onRetry && <Button onClick={onRetry} className="min-h-11">Reintentar</Button>}<SafeDiagnosticButton error={error} area="movimientos" className="min-h-11" /></div></div>
          : filteredTransactions.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center p-6 text-center text-muted-foreground"><Layers className="mb-2 h-10 w-10 opacity-30" /><p className="text-sm font-semibold">{total > 0 ? 'No hay resultados con estos filtros' : 'Todavía no hay movimientos'}</p><p className="mt-1 max-w-sm text-xs">{total > 0 ? 'Prueba cambiando el mes o limpiando los filtros.' : 'Revisa tu conexión de Gmail o registra un movimiento manual.'}</p>{total === 0 && <div className="mt-4 flex flex-wrap justify-center gap-2">{onOpenConnections && <Button variant="outline" className="min-h-11" onClick={onOpenConnections}>Revisar conexión</Button>}{onAddManual && <Button className="min-h-11" onClick={onAddManual}>Registrar manual</Button>}</div>}</div>
            : <><TransactionMobileList groups={groups} hideBalances={hideBalances} onEdit={onEdit} /><TransactionDesktopTable groups={groups} hideBalances={hideBalances} onEdit={onEdit} /></>}
      </CardContent>
      <TransactionPagination page={page} total={total} totalPages={totalPages} onPageChange={setPage} />
    </Card>
  );
};
