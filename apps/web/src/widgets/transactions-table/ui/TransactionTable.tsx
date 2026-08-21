import React from 'react';
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
  X
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge } from '@/shared/ui';
import { formatCurrency, formatDate, getOrganizationMeta } from '@/shared/lib';
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
  loading: boolean;
}

const isReceivedTransfer = (tx: Transaction) => {
  return (
    /recibida/i.test(tx.transactionType) ||
    /ingreso/i.test(tx.category) ||
    tx.source === 'BHD_TRANSFER_INCOME'
  );
};

const isSentTransfer = (tx: Transaction) => {
  return (
    !isReceivedTransfer(tx) &&
    (/transferencia/i.test(tx.transactionType) || /transferencia/i.test(tx.category) || tx.source === 'BHD_TRANSFER_EMAIL')
  );
};

const isServicePayment = (tx: Transaction) => {
  return (
    /servicio/i.test(tx.transactionType) ||
    tx.category === 'Servicios' ||
    tx.source === 'BHD_SERVICE_PAYMENT'
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
  loading,
}) => {
  const totalPages = Math.ceil(total / limit) || 1;

  // Active filters count
  const activeFiltersCount = [
    search ? 1 : 0,
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

  return (
    <Card className="border-border/60 shadow-sm overflow-hidden">
      <CardHeader className="p-4 sm:p-6 pb-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg font-bold text-foreground">Historial de Transacciones</CardTitle>
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted font-medium text-muted-foreground">
                {total} registros
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Consulta, filtra y clasifica movimientos financieros de todas tus organizaciones
            </p>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Search */}
            <div className="relative w-full sm:w-52">
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
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Organization Filter */}
            <div className="relative">
              <select
                value={organizationFilter}
                onChange={(e) => {
                  setOrganizationFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 rounded-md border border-input bg-background px-2.5 text-xs shadow-sm focus:outline-none font-medium cursor-pointer"
              >
                <option value="">🏛️ Todas las Entidades</option>
                <option value="BHD">🟢 Banco BHD</option>
                <option value="POPULAR">🔵 Banco Popular</option>
                <option value="BANRESERVAS">🔷 Banreservas</option>
                <option value="QIK">🟣 Qik Banco Digital</option>
                <option value="APAP">🟠 APAP</option>
                <option value="SCOTIABANK">🔴 Scotiabank</option>
              </select>
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 rounded-md border border-input bg-background px-2.5 text-xs shadow-sm focus:outline-none font-medium cursor-pointer"
            >
              <option value="">Todos los Tipos</option>
              <option value="recibida">📥 Transferencias Recibidas</option>
              <option value="enviada">↗️ Transferencias Enviadas</option>
              <option value="compra">💳 Compras con Tarjeta</option>
              <option value="servicio">🧾 Pagos de Servicios</option>
              <option value="retiro">🏧 Retiros de Cajero</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 rounded-md border border-input bg-background px-2.5 text-xs shadow-sm focus:outline-none cursor-pointer"
            >
              <option value="">Todas las Categorías</option>
              <option value="Supermercado">Supermercado</option>
              <option value="Servicios Financieros">Servicios Financieros</option>
              <option value="Transferencias">Transferencias</option>
              <option value="Ingresos / Transferencias">Ingresos / Recibidas</option>
              <option value="Restaurantes & Delivery">Restaurantes & Delivery</option>
              <option value="Transporte">Transporte</option>
              <option value="Combustible">Combustible</option>
              <option value="Servicios">Servicios</option>
              <option value="Suscripciones">Suscripciones</option>
              <option value="Salud & Farmacia">Salud & Farmacia</option>
              <option value="Compras Online">Compras Online</option>
              <option value="Otros">Otros</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 rounded-md border border-input bg-background px-2.5 text-xs shadow-sm focus:outline-none cursor-pointer"
            >
              <option value="">Todos los Estados</option>
              <option value="Aprobada">Aprobadas</option>
              <option value="Rechazada">Rechazadas</option>
            </select>

            {/* Reset Filters Button */}
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onResetFilters}
                className="h-9 gap-1 text-xs text-muted-foreground hover:text-foreground"
                title="Restablecer todos los filtros"
              >
                <X className="h-3.5 w-3.5" />
                <span>Limpiar ({activeFiltersCount})</span>
              </Button>
            )}

          </div>
        </div>
      </CardHeader>

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
          <div className="overflow-x-auto">
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
                {filteredTransactions.map((tx) => {
                  const isRejected = /rechazad|declinad|denegad/i.test(tx.status);
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

                      {/* Tipo de Movimiento (Enviada vs Recibida vs Compra) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderTypeBadge(tx)}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                          {tx.category || 'Otros'}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(tx.transactionDate)}
                      </td>

                      {/* Card or Account */}
                      <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                        {tx.cardLast4 ? (
                          <span className="font-mono bg-muted/70 px-1.5 py-0.5 rounded text-[11px]">
                            •••• {tx.cardLast4}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isRejected ? (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Rechazada
                          </Badge>
                        ) : (
                          <Badge variant="success" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Aprobada
                          </Badge>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className={`font-bold text-sm ${
                          isRejected 
                            ? 'line-through text-muted-foreground' 
                            : isIncome
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-foreground'
                        }`}>
                          {isIncome ? `+ ` : ''}{formatCurrency(tx.amount, tx.currency)}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-semibold">
                          {tx.currency}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(tx)}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-80 group-hover:opacity-100"
                          title="Editar comercio o categoría"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 sm:px-6 border-t text-xs text-muted-foreground">
          <div>
            Mostrando página <span className="font-semibold text-foreground">{page}</span> de{' '}
            <span className="font-semibold text-foreground">{totalPages}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1 || loading}
              className="h-8 gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Anterior</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages || loading}
              className="h-8 gap-1"
            >
              <span>Siguiente</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
