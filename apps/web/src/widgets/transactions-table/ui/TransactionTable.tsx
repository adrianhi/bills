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
  ArrowLeftRight,
  Edit3, 
  ChevronLeft, 
  ChevronRight,
  Layers
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Badge } from '@/shared/ui';
import { formatCurrency, formatDate } from '@/shared/lib';
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
  onEdit: (tx: Transaction) => void;
  loading: boolean;
}

const getCategoryIcon = (category: string, type: string) => {
  if (/transferencia/i.test(type) || /transferencia/i.test(category)) {
    return <ArrowLeftRight className="h-4 w-4 text-sky-500" />;
  }
  const lower = (category || '').toLowerCase();
  if (lower.includes('supermercado') || lower.includes('bravo') || lower.includes('nacional')) {
    return <ShoppingCart className="h-4 w-4 text-emerald-500" />;
  }
  if (lower.includes('financiero') || lower.includes('banco') || lower.includes('retiro')) {
    return <Landmark className="h-4 w-4 text-blue-500" />;
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
  if (lower.includes('servicio') || lower.includes('luz') || lower.includes('claro')) {
    return <Zap className="h-4 w-4 text-yellow-500" />;
  }
  return <ShoppingBag className="h-4 w-4 text-slate-400" />;
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
  onEdit,
  loading,
}) => {
  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="p-4 sm:p-6 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold">Historial de Transacciones</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {total} transacciones encontradas
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar comercio, beneficiario..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-8 h-9 text-xs"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 rounded-md border border-input bg-background px-2.5 text-xs shadow-sm focus:outline-none"
            >
              <option value="">Todos los Estados</option>
              <option value="Aprobada">Aprobadas</option>
              <option value="Rechazada">Rechazadas</option>
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 rounded-md border border-input bg-background px-2.5 text-xs shadow-sm focus:outline-none"
            >
              <option value="">Todas las Categorías</option>
              <option value="Supermercado">Supermercado</option>
              <option value="Servicios Financieros">Servicios Financieros</option>
              <option value="Transferencias">Transferencias</option>
              <option value="Restaurantes & Delivery">Restaurantes & Delivery</option>
              <option value="Transporte">Transporte</option>
              <option value="Combustible">Combustible</option>
              <option value="Servicios">Servicios</option>
              <option value="Suscripciones">Suscripciones</option>
              <option value="Salud & Farmacia">Salud & Farmacia</option>
              <option value="Compras Online">Compras Online</option>
              <option value="Otros">Otros</option>
            </select>

          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Cargando transacciones...
          </div>
        ) : transactions.length === 0 ? (
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
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4">Fecha & Hora</th>
                  <th className="py-3 px-4">Cuenta / Tarjeta</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Monto</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {transactions.map((tx) => {
                  const isRejected = /rechazad|declinad|denegad/i.test(tx.status);
                  return (
                    <tr 
                      key={tx.id} 
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      {/* Merchant */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted/60 flex-shrink-0">
                            {getCategoryIcon(tx.category, tx.transactionType)}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground truncate max-w-[180px] sm:max-w-[240px]" title={tx.merchant}>
                              {tx.merchant}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono truncate max-w-[180px]" title={tx.rawMerchant}>
                              {tx.rawMerchant}
                            </div>
                          </div>
                        </div>
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
                        <Badge variant={isRejected ? 'destructive' : 'success'}>
                          {tx.status || 'Aprobada'}
                        </Badge>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className={`font-bold text-sm ${isRejected ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {formatCurrency(tx.amount, tx.currency)}
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
