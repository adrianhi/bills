import type { ReactNode } from 'react';
import { ArrowUpRight, CreditCard, FileDown, Search, ShoppingCart, SlidersHorizontal, Utensils, X } from 'lucide-react';
import { Badge, Button, CardHeader, CardTitle, Input } from '@/shared/ui';

export interface TransactionFilterState {
  search: string;
  category: string;
  status: string;
  organization: string;
  type: string;
}

interface Props {
  total: number;
  filters: TransactionFilterState;
  onFilterChange: (filter: keyof TransactionFilterState, value: string) => void;
  onReset: () => void;
  onOpenFilters: () => void;
  onExport?: () => void;
}

const QuickChip = ({ active, icon, label, onClick }: { active: boolean; icon?: ReactNode; label: string; onClick: () => void }) => (
  <button type="button" onClick={onClick} className={`flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${active ? 'bg-emerald-500/20 text-emerald-600 ring-1 ring-emerald-500/40 dark:text-emerald-400' : 'bg-muted/60 text-muted-foreground hover:bg-muted'}`}>{icon}{label}</button>
);

export const TransactionTableHeader = ({ total, filters, onFilterChange, onReset, onOpenFilters, onExport }: Props) => {
  const activeCount = [filters.category, filters.status, filters.organization, filters.type].filter(Boolean).length;
  const toggle = (filter: keyof TransactionFilterState, value: string) => onFilterChange(filter, filters[filter] === value ? '' : value);
  const activeFilters: Array<[keyof TransactionFilterState, string, string]> = [
    ['organization', 'Banco', filters.organization],
    ['type', 'Tipo', filters.type],
    ['category', 'Categoría', filters.category],
    ['status', 'Estado', filters.status],
  ];

  return (
    <CardHeader className="p-4 pb-3 sm:p-5" data-product-tour="transactions">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2"><CardTitle className="text-lg font-bold">Historial de Transacciones</CardTitle><span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{total} registros</span></div>
          <p className="mt-0.5 text-xs text-muted-foreground">Consulta, filtra y clasifica movimientos financieros</p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Buscar comercio, nota..." value={filters.search} onChange={(event) => onFilterChange('search', event.target.value)} className="h-9 pl-8 pr-8 text-xs" />
            {filters.search && <button type="button" onClick={() => onFilterChange('search', '')} className="absolute right-2.5 top-2.5 cursor-pointer text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
          </div>
          <Button variant="outline" size="sm" onClick={onOpenFilters} className="h-9 shrink-0 cursor-pointer gap-2 px-3"><SlidersHorizontal className="h-3.5 w-3.5 text-emerald-500" /><span className="text-xs font-semibold">Filtros</span>{activeCount > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">{activeCount}</span>}</Button>
          <Button variant="outline" size="sm" onClick={onExport} className="h-9 shrink-0 cursor-pointer gap-2 px-3"><FileDown className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-xs font-semibold">Exportar</span></Button>
        </div>
      </div>

      <div className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 py-2 sm:mx-0 sm:px-0">
        <QuickChip active={!filters.organization && !filters.type && !filters.category} label="Todos" onClick={onReset} />
        <QuickChip active={filters.organization === 'BHD'} icon={<span className="h-2 w-2 rounded-full bg-emerald-500" />} label="BHD" onClick={() => toggle('organization', 'BHD')} />
        <QuickChip active={filters.organization === 'POPULAR'} icon={<span className="h-2 w-2 rounded-full bg-blue-500" />} label="Popular" onClick={() => toggle('organization', 'POPULAR')} />
        <QuickChip active={filters.organization === 'BANRESERVAS'} icon={<span className="h-2 w-2 rounded-full bg-sky-600" />} label="Banreservas" onClick={() => toggle('organization', 'BANRESERVAS')} />
        <QuickChip active={filters.type === 'compra'} icon={<CreditCard className="h-3 w-3" />} label="Compras" onClick={() => toggle('type', 'compra')} />
        <QuickChip active={filters.type === 'enviada'} icon={<ArrowUpRight className="h-3 w-3" />} label="Transf. Enviadas" onClick={() => toggle('type', 'enviada')} />
        <QuickChip active={filters.category === 'Supermercado'} icon={<ShoppingCart className="h-3 w-3" />} label="Supermercado" onClick={() => toggle('category', 'Supermercado')} />
        <QuickChip active={filters.category === 'Restaurantes & Delivery'} icon={<Utensils className="h-3 w-3" />} label="Restaurantes" onClick={() => toggle('category', 'Restaurantes & Delivery')} />
      </div>

      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-2">
          <span className="mr-1 text-[11px] font-semibold text-muted-foreground">Filtros activos:</span>
          {activeFilters.filter(([, , value]) => value).map(([filter, label, value]) => <Badge key={filter} variant="secondary" className="h-6 gap-1 text-[11px] font-medium">{label}: {value}<button type="button" onClick={() => onFilterChange(filter, '')} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button></Badge>)}
          <button type="button" onClick={onReset} className="ml-1 cursor-pointer text-[11px] font-semibold text-muted-foreground underline hover:text-destructive">Limpiar todo</button>
        </div>
      )}
    </CardHeader>
  );
};
