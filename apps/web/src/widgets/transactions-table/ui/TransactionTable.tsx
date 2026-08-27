import React, { useState } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Landmark, 
  Utensils, 
  Car, 
  Fuel, 
  Tv, 
  HeartPulse, 
  ShoppingBag, 
  Zap, 
  ArrowDownLeft, 
  ArrowUpRight, 
  CreditCard, 
  Receipt, 
  Edit3, 
  ChevronLeft, 
  ChevronRight, 
  Layers, 
  CheckCircle2, 
  XCircle,
  Clock3,
  Undo2,
  X,
  SlidersHorizontal,
  Calendar
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge } from '@/shared/ui';
import { formatCurrency, formatDate, getOrganizationMeta } from '@/shared/lib';
import { FilterDrawer } from '@/features/filter-drawer';
import type { Transaction } from '@/entities/transaction';

interface TransactionTableProps {
  transactions: Transaction[];
  total: number;
  page: number;
  setPage: (page: number) => void;
  limit: number;
  search: string;
  setSearch: (search: string) => void;
  categoryFilter: string;
  setCategoryFilter: (cat: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  organizationFilter: string;
  setOrganizationFilter: (org: string) => void;
  typeFilter: string;
  setTypeFilter: (type: string) => void;
  onResetFilters: () => void;
  onEdit: (tx: Transaction) => void;
  onExport?: () => void;
  loading: boolean;
  hideBalances?: boolean;
}

interface TransactionGroup {
  dateKey: string;
  title: string;
  subtitle: string;
  totalExpenseDOP: number;
  totalIncomeDOP: number;
  totalExpenseUSD: number;
  totalIncomeUSD: number;
  transactions: Transaction[];
}

const statusCode = (tx: Transaction) => tx.statusCode || (
  /reversad|anulad/i.test(tx.status) ? 'REVERSED' :
  /rechazad|declinad|denegad/i.test(tx.status) ? 'DECLINED' :
  /pendiente|procesando/i.test(tx.status) ? 'PENDING' : 'APPROVED'
);

const renderStatus = (tx: Transaction) => {
  switch (statusCode(tx)) {
    case 'REVERSED':
      return <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400"><Undo2 className="h-3.5 w-3.5" />Reversada</span>;
    case 'DECLINED':
      return <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive"><XCircle className="h-3.5 w-3.5" />Rechazada</span>;
    case 'PENDING':
      return <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 dark:text-sky-400"><Clock3 className="h-3.5 w-3.5" />Pendiente</span>;
    default:
      return <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" />Aprobada</span>;
  }
};

const isReceivedTransfer = (tx: Transaction) => {
  return (
    tx.source === 'BHD_TRANSFER_INCOME' ||
    /recibida/i.test(tx.transactionType) ||
    /recibida/i.test(tx.category) ||
    /ordenante/i.test(tx.notes || '') ||
    (tx.amount > 0 && /transferencia/i.test(tx.transactionType) && /ingreso/i.test(tx.category))
  );
};

const isSentTransfer = (tx: Transaction) => {
  return (
    tx.source === 'BHD_TRANSFER_SENT' ||
    /enviada/i.test(tx.transactionType) ||
    /beneficiario/i.test(tx.notes || '') ||
    (/transferencia/i.test(tx.transactionType) && !isReceivedTransfer(tx))
  );
};

const isServicePayment = (tx: Transaction) => {
  return (
    tx.source === 'BHD_SERVICE_PAYMENT' ||
    /pago de servicio/i.test(tx.transactionType) ||
    /impuesto/i.test(tx.transactionType) ||
    /pago/i.test(tx.transactionType)
  );
};

const isAtmWithdrawal = (tx: Transaction) => {
  return /retiro/i.test(tx.transactionType) || /retiro/i.test(tx.rawMerchant);
};

const getTransactionIcon = (tx: Transaction) => {
  if (isReceivedTransfer(tx)) {
    return <ArrowDownLeft className="h-4 w-4 text-emerald-500" />;
  }
  if (isSentTransfer(tx)) {
    return <ArrowUpRight className="h-4 w-4 text-sky-500" />;
  }
  if (isServicePayment(tx)) {
    return <Zap className="h-4 w-4 text-amber-500" />;
  }
  if (isAtmWithdrawal(tx)) {
    return <Landmark className="h-4 w-4 text-blue-500" />;
  }

  const lower = (tx.category || '').toLowerCase();
  if (lower.includes('supermercado') || lower.includes('bravo') || lower.includes('nacional')) {
    return <ShoppingCart className="h-4 w-4 text-emerald-500" />;
  }
  if (lower.includes('restaurante') || lower.includes('delivery') || lower.includes('comida')) {
    return <Utensils className="h-4 w-4 text-amber-500" />;
  }
  if (lower.includes('combustible')) {
    return <Fuel className="h-4 w-4 text-orange-500" />;
  }
  if (lower.includes('transporte') || lower.includes('uber') || lower.includes('taxi')) {
    return <Car className="h-4 w-4 text-indigo-500" />;
  }
  if (lower.includes('suscripción') || lower.includes('streaming') || lower.includes('netflix')) {
    return <Tv className="h-4 w-4 text-cyan-500" />;
  }
  if (lower.includes('salud') || lower.includes('farmacia') || lower.includes('médico')) {
    return <HeartPulse className="h-4 w-4 text-rose-500" />;
  }
  return <ShoppingBag className="h-4 w-4 text-slate-400" />;
};

const renderTypeBadge = (tx: Transaction) => {
  if (isReceivedTransfer(tx)) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        <ArrowDownLeft className="h-3 w-3" />
        Recibida
      </span>
    );
  }
  if (isSentTransfer(tx)) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/20">
        <ArrowUpRight className="h-3 w-3" />
        Enviada
      </span>
    );
  }
  if (isServicePayment(tx)) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
        <Receipt className="h-3 w-3" />
        Servicio
      </span>
    );
  }
  if (isAtmWithdrawal(tx)) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
        <Landmark className="h-3 w-3" />
        Retiro
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-muted text-muted-foreground border border-border">
      <CreditCard className="h-3 w-3" />
      Compra
    </span>
  );
};

const formatGroupDate = (dateStr: string) => {
  const d = new Date(dateStr);
  const now = new Date();
  
  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(d, now)) {
    return {
      title: 'Hoy',
      subtitle: d.toLocaleDateString('es-DO', { day: 'numeric', month: 'short' }),
    };
  }
  if (isSameDay(d, yesterday)) {
    return {
      title: 'Ayer',
      subtitle: d.toLocaleDateString('es-DO', { day: 'numeric', month: 'short' }),
    };
  }

  const weekday = d.toLocaleDateString('es-DO', { weekday: 'long' });
  const capitalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  const dateFormatted = d.toLocaleDateString('es-DO', { 
    day: 'numeric', 
    month: 'short', 
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
  });

  return {
    title: capitalizedWeekday,
    subtitle: dateFormatted,
  };
};

const groupTransactionsByDate = (txs: Transaction[]): TransactionGroup[] => {
  const groupsMap = new Map<string, TransactionGroup>();

  for (const tx of txs) {
    const d = new Date(tx.transactionDate);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    if (!groupsMap.has(dateKey)) {
      const { title, subtitle } = formatGroupDate(tx.transactionDate);
      groupsMap.set(dateKey, {
        dateKey,
        title,
        subtitle,
        totalExpenseDOP: 0,
        totalIncomeDOP: 0,
        totalExpenseUSD: 0,
        totalIncomeUSD: 0,
        transactions: [],
      });
    }

    const group = groupsMap.get(dateKey)!;
    group.transactions.push(tx);

    if (statusCode(tx) === 'APPROVED') {
      const isIncome = isReceivedTransfer(tx);
      const amount = Number(tx.amount) || 0;
      if (tx.currency === 'USD') {
        if (isIncome) group.totalIncomeUSD += amount;
        else group.totalExpenseUSD += amount;
      } else {
        if (isIncome) group.totalIncomeDOP += amount;
        else group.totalExpenseDOP += amount;
      }
    }
  }

  return Array.from(groupsMap.values());
};

export const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  total,
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
  hideBalances = false,
}) => {
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const totalPages = Math.ceil(total / limit) || 1;

  // Active filters count (excluding search)
  const activeFiltersCount = [
    categoryFilter ? 1 : 0,
    statusFilter ? 1 : 0,
    organizationFilter ? 1 : 0,
    typeFilter ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // Filtrado local por tipo si no se filtró en API
  const filteredTransactions = transactions.filter((tx) => {
    if (!typeFilter) return true;
    if (typeFilter === 'recibida') return isReceivedTransfer(tx);
    if (typeFilter === 'enviada') return isSentTransfer(tx);
    if (typeFilter === 'servicio') return isServicePayment(tx);
    if (typeFilter === 'retiro') return isAtmWithdrawal(tx);
    if (typeFilter === 'compra') return !isReceivedTransfer(tx) && !isSentTransfer(tx) && !isServicePayment(tx) && !isAtmWithdrawal(tx);
    return true;
  });

  const groupedTransactions = groupTransactionsByDate(filteredTransactions);

  return (
    <Card className="border-border/60 shadow-sm overflow-hidden">
      <CardHeader className="p-4 sm:p-5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          
          {/* Title & Count */}
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-bold text-foreground">Historial de Transacciones</CardTitle>
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-medium text-muted-foreground">
                {total} registros
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Consulta, filtra y clasifica movimientos financieros
            </p>
          </div>

          {/* Search & Drawer Trigger Bar */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-60">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar comercio, nota..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8 pr-8 h-9 text-xs"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter Drawer Trigger Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFilterDrawerOpen(true)}
              className="gap-2 h-9 px-3 border-border/80 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all cursor-pointer shrink-0"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-emerald-500" />
              <span className="font-semibold text-xs">Filtros</span>
              {activeFiltersCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Quick Horizontal Carousel Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-2 scrollbar-none no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {/* Quick Bank Chips */}
          <button
            onClick={() => {
              setOrganizationFilter('');
              setPage(1);
            }}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              !organizationFilter && !typeFilter && !categoryFilter
                ? 'bg-foreground text-background shadow-xs'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted'
            }`}
          >
            Todos
          </button>
          
          <button
            onClick={() => {
              setOrganizationFilter(organizationFilter === 'BHD' ? '' : 'BHD');
              setPage(1);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              organizationFilter === 'BHD'
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/40'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            BHD
          </button>

          <button
            onClick={() => {
              setOrganizationFilter(organizationFilter === 'POPULAR' ? '' : 'POPULAR');
              setPage(1);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              organizationFilter === 'POPULAR'
                ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/40'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            Popular
          </button>

          <button
            onClick={() => {
              setOrganizationFilter(organizationFilter === 'BANRESERVAS' ? '' : 'BANRESERVAS');
              setPage(1);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              organizationFilter === 'BANRESERVAS'
                ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/40'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-sky-600" />
            Banreservas
          </button>

          <button
            onClick={() => {
              setTypeFilter(typeFilter === 'recibida' ? '' : 'recibida');
              setPage(1);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              typeFilter === 'recibida'
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/40'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted'
            }`}
          >
            <ArrowDownLeft className="h-3 w-3 text-emerald-500" />
            Ingresos
          </button>

          <button
            onClick={() => {
              setTypeFilter(typeFilter === 'compra' ? '' : 'compra');
              setPage(1);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              typeFilter === 'compra'
                ? 'bg-muted text-foreground ring-1 ring-foreground/30 font-bold'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted'
            }`}
          >
            <CreditCard className="h-3 w-3 text-slate-400" />
            Compras
          </button>

          <button
            onClick={() => {
              setTypeFilter(typeFilter === 'enviada' ? '' : 'enviada');
              setPage(1);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              typeFilter === 'enviada'
                ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/40'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted'
            }`}
          >
            <ArrowUpRight className="h-3 w-3 text-sky-500" />
            Transf. Enviadas
          </button>

          <button
            onClick={() => {
              setCategoryFilter(categoryFilter === 'Supermercado' ? '' : 'Supermercado');
              setPage(1);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              categoryFilter === 'Supermercado'
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/40'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted'
            }`}
          >
            <ShoppingCart className="h-3 w-3 text-emerald-500" />
            Supermercado
          </button>

          <button
            onClick={() => {
              setCategoryFilter(categoryFilter === 'Restaurantes & Delivery' ? '' : 'Restaurantes & Delivery');
              setPage(1);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              categoryFilter === 'Restaurantes & Delivery'
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/40'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted'
            }`}
          >
            <Utensils className="h-3 w-3 text-amber-500" />
            Restaurantes
          </button>
        </div>

        {/* Active Filter Badges Bar */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/40">
            <span className="text-[11px] font-semibold text-muted-foreground mr-1">Filtros activos:</span>
            
            {organizationFilter && (
              <Badge variant="secondary" className="gap-1 text-[11px] font-medium h-6">
                Banco: {organizationFilter}
                <button onClick={() => setOrganizationFilter('')} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {typeFilter && (
              <Badge variant="secondary" className="gap-1 text-[11px] font-medium h-6">
                Tipo: {typeFilter}
                <button onClick={() => setTypeFilter('')} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {categoryFilter && (
              <Badge variant="secondary" className="gap-1 text-[11px] font-medium h-6">
                Categoría: {categoryFilter}
                <button onClick={() => setCategoryFilter('')} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            {statusFilter && (
              <Badge variant="secondary" className="gap-1 text-[11px] font-medium h-6">
                Estado: {statusFilter}
                <button onClick={() => setStatusFilter('')} className="ml-1 hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}

            <button
              onClick={onResetFilters}
              className="text-[11px] font-semibold text-muted-foreground hover:text-destructive underline ml-1 cursor-pointer"
            >
              Limpiar todo
            </button>
          </div>
        )}
      </CardHeader>

      {/* Filter Drawer Component */}
      <FilterDrawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        organizationFilter={organizationFilter}
        setOrganizationFilter={(org) => {
          setOrganizationFilter(org);
          setPage(1);
        }}
        typeFilter={typeFilter}
        setTypeFilter={(t) => {
          setTypeFilter(t);
          setPage(1);
        }}
        categoryFilter={categoryFilter}
        setCategoryFilter={(c) => {
          setCategoryFilter(c);
          setPage(1);
        }}
        statusFilter={statusFilter}
        setStatusFilter={(s) => {
          setStatusFilter(s);
          setPage(1);
        }}
        onResetFilters={onResetFilters}
        totalResults={total}
        onExport={onExport}
      />

      <CardContent className="p-0">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Cargando transacciones...
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-6 text-muted-foreground">
            <Layers className="h-10 w-10 mb-2 opacity-30" />
            <p className="font-semibold text-sm">No se encontraron transacciones</p>
            <p className="text-xs mt-1">Prueba cambiando el mes o los filtros de búsqueda.</p>
          </div>
        ) : (
          <>
            {/* 1. Mobile Date-Grouped Touch Cards */}
            <div className="block lg:hidden">
              {groupedTransactions.map((group) => (
                <div key={group.dateKey} className="border-b border-border/40 last:border-b-0">
                  {/* Sticky Date Header with Daily Total */}
                  <div className="sticky top-0 z-10 bg-muted/95 dark:bg-muted/90 backdrop-blur-md px-4 py-2 border-y border-border/50 flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-xs font-extrabold text-foreground">{group.title}</span>
                      <span className="text-[11px] text-muted-foreground font-medium">• {group.subtitle}</span>
                    </div>

                    <div className="text-right">
                      {hideBalances ? (
                        <span className="text-xs font-bold text-muted-foreground">••••••</span>
                      ) : (
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          {group.totalExpenseDOP > 0 && (
                            <span className="text-foreground">
                              -{formatCurrency(group.totalExpenseDOP, 'DOP')}
                            </span>
                          )}
                          {group.totalIncomeDOP > 0 && (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              +{formatCurrency(group.totalIncomeDOP, 'DOP')}
                            </span>
                          )}
                          {group.totalExpenseDOP === 0 && group.totalIncomeDOP === 0 && group.totalExpenseUSD > 0 && (
                            <span className="text-foreground">
                              -${group.totalExpenseUSD.toFixed(2)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Group Items */}
                  <div className="divide-y divide-border/30">
                    {group.transactions.map((tx) => {
                      const isInactive = statusCode(tx) !== 'APPROVED';
                      const isIncome = isReceivedTransfer(tx);
                      const isSent = isSentTransfer(tx);
                      const orgMeta = getOrganizationMeta(tx.source, tx.merchant);

                      return (
                        <div
                          key={tx.id}
                          onClick={() => onEdit(tx)}
                          className="p-3.5 sm:p-4 hover:bg-muted/30 active:bg-muted/50 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-2xl flex-shrink-0 ${
                              isIncome ? 'bg-emerald-500/15' : isSent ? 'bg-sky-500/15' : 'bg-muted/70'
                            }`}>
                              {getTransactionIcon(tx)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-sm text-foreground truncate">
                                {tx.merchant}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                                <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold border ${orgMeta.badgeClass}`}>
                                  {orgMeta.shortName}
                                </span>
                                <span className="truncate">{tx.category || 'Otros'}</span>
                                <span>•</span>
                                <span className="truncate">{formatDate(tx.transactionDate)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className={`font-black text-sm ${
                              isInactive
                                ? 'line-through text-muted-foreground'
                                : isIncome
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-foreground'
                            }`}>
                              {hideBalances ? '••••••' : `${isIncome ? '+ ' : ''}${formatCurrency(tx.amount, tx.currency)}`}
                            </div>
                            <div className="text-[10px] text-muted-foreground font-semibold">
                              {tx.currency} {tx.cardLast4 ? `•••• ${tx.cardLast4}` : ''}
                            </div>
                            <div className="mt-0.5">{renderStatus(tx)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* 2. Desktop Full Table with Date Section Rows */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-y">
                  <tr>
                    <th className="py-3 px-4 sm:px-6">Comercio / Beneficiario</th>
                    <th className="py-3 px-4">Tipo de Movimiento</th>
                    <th className="py-3 px-4">Categoría</th>
                    <th className="py-3 px-4">Fecha & Hora</th>
                    <th className="py-3 px-4">Cuenta / Tarjeta</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Monto</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {groupedTransactions.map((group) => (
                    <React.Fragment key={group.dateKey}>
                      {/* Date Group Section Header */}
                      <tr className="bg-muted/40 border-y border-border/60">
                        <td colSpan={8} className="py-2 px-6">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                              <span className="text-foreground">{group.title}</span>
                              <span className="text-muted-foreground font-normal">
                                • {group.subtitle} ({group.transactions.length} {group.transactions.length === 1 ? 'movimiento' : 'movimientos'})
                              </span>
                            </div>
                            <div className="flex items-center gap-3 font-bold">
                              {hideBalances ? (
                                <span className="text-muted-foreground">••••••</span>
                              ) : (
                                <>
                                  {group.totalExpenseDOP > 0 && (
                                    <span className="text-foreground">
                                      Gasto: -{formatCurrency(group.totalExpenseDOP, 'DOP')}
                                    </span>
                                  )}
                                  {group.totalIncomeDOP > 0 && (
                                    <span className="text-emerald-600 dark:text-emerald-400">
                                      Ingreso: +{formatCurrency(group.totalIncomeDOP, 'DOP')}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Group Transactions */}
                      {group.transactions.map((tx) => {
                        const isInactive = statusCode(tx) !== 'APPROVED';
                        const isIncome = isReceivedTransfer(tx);
                        const isSent = isSentTransfer(tx);
                        const orgMeta = getOrganizationMeta(tx.source, tx.merchant);

                        return (
                          <tr 
                            key={tx.id} 
                            className={`hover:bg-muted/30 transition-colors group ${
                              isIncome ? 'bg-emerald-500/[0.02]' : ''
                            }`}
                          >
                            {/* Merchant */}
                            <td className="py-3.5 px-4 sm:px-6">
                              <div className="flex items-center gap-3">
                                <div className={`flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0 ${
                                  isIncome 
                                    ? 'bg-emerald-500/15' 
                                    : isSent 
                                    ? 'bg-sky-500/15' 
                                    : 'bg-muted/60'
                                }`}>
                                  {getTransactionIcon(tx)}
                                </div>
                                <div>
                                  <div className="font-semibold text-foreground truncate max-w-[180px] sm:max-w-[240px]" title={tx.merchant}>
                                    {tx.merchant}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold border ${orgMeta.badgeClass}`}>
                                      {orgMeta.shortName}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground font-mono truncate max-w-[140px]" title={tx.notes || tx.rawMerchant}>
                                      {tx.notes || tx.rawMerchant}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Movement Type */}
                            <td className="py-3.5 px-4">
                              {renderTypeBadge(tx)}
                            </td>

                            {/* Category */}
                            <td className="py-3.5 px-4">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted/60 text-foreground border border-border/50">
                                {tx.category || 'Otros'}
                              </span>
                            </td>

                            {/* Date */}
                            <td className="py-3.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                              {formatDate(tx.transactionDate)}
                            </td>

                            {/* Account / Card */}
                            <td className="py-3.5 px-4 text-xs font-mono text-muted-foreground">
                              {tx.cardLast4 ? `•••• ${tx.cardLast4}` : 'N/A'}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4">
                              {renderStatus(tx)}
                            </td>

                            {/* Amount */}
                            <td className="py-3.5 px-4 text-right">
                              <div className={`font-bold font-mono text-sm ${
                                isInactive
                                  ? 'line-through text-muted-foreground'
                                  : isIncome
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-foreground'
                              }`}>
                                {hideBalances ? '••••••' : `${isIncome ? '+ ' : ''}${formatCurrency(tx.amount, tx.currency)}`}
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onEdit(tx)}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                                title="Editar clasificación"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t text-xs text-muted-foreground">
        <div>
          Mostrando página <span className="font-bold text-foreground">{page}</span> de{' '}
          <span className="font-bold text-foreground">{totalPages}</span> ({total} registros)
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="h-8 gap-1 text-xs cursor-pointer"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Anterior</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="h-8 gap-1 text-xs cursor-pointer"
          >
            <span>Siguiente</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
