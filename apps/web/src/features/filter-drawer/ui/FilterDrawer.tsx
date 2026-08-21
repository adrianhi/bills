import React from 'react';
import { 
  X, 
  RotateCcw, 
  Check, 
  SlidersHorizontal,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Receipt,
  Landmark,
  ShoppingCart,
  Utensils,
  Fuel,
  Car,
  Tv,
  HeartPulse,
  ShoppingBag,
  Zap,
  Download
} from 'lucide-react';
import { Button } from '@/shared/ui';

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  organizationFilter: string;
  setOrganizationFilter: (org: string) => void;
  typeFilter: string;
  setTypeFilter: (type: string) => void;
  categoryFilter: string;
  setCategoryFilter: (cat: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  onResetFilters: () => void;
  totalResults: number;
  onExport?: () => void;
}

const ORGANIZATIONS = [
  { id: '', label: '🏛️ Todos los Bancos', color: 'border-border/60' },
  { id: 'BHD', label: '🟢 Banco BHD', color: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400' },
  { id: 'POPULAR', label: '🔵 Banco Popular', color: 'border-sky-500/40 bg-sky-500/5 text-sky-600 dark:text-sky-400' },
  { id: 'BANRESERVAS', label: '🔷 Banreservas', color: 'border-blue-500/40 bg-blue-500/5 text-blue-600 dark:text-blue-400' },
  { id: 'QIK', label: '🟣 Qik Banco Digital', color: 'border-purple-500/40 bg-purple-500/5 text-purple-600 dark:text-purple-400' },
  { id: 'APAP', label: '🟠 APAP', color: 'border-orange-500/40 bg-orange-500/5 text-orange-600 dark:text-orange-400' },
  { id: 'SCOTIABANK', label: '🔴 Scotiabank', color: 'border-red-500/40 bg-red-500/5 text-red-600 dark:text-red-400' },
  { id: 'MANUAL', label: '⚪ Manual / Efectivo', color: 'border-slate-500/40 bg-slate-500/5 text-slate-400' },
];

const TRANSACTION_TYPES = [
  { id: '', label: 'Todos los Tipos', icon: SlidersHorizontal },
  { id: 'recibida', label: '📥 Ingresos / Recibidas', icon: ArrowDownLeft, activeColor: 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400' },
  { id: 'compra', label: '💳 Compras con Tarjeta', icon: CreditCard, activeColor: 'bg-slate-500/15 border-slate-400 text-foreground' },
  { id: 'enviada', label: '↗️ Transf. Enviadas', icon: ArrowUpRight, activeColor: 'bg-sky-500/15 border-sky-500 text-sky-600 dark:text-sky-400' },
  { id: 'servicio', label: '🧾 Pagos de Servicios', icon: Receipt, activeColor: 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400' },
  { id: 'retiro', label: '🏧 Retiros de Cajero', icon: Landmark, activeColor: 'bg-blue-500/15 border-blue-500 text-blue-600 dark:text-blue-400' },
];

const CATEGORIES = [
  { id: '', label: 'Todas las Categorías', icon: ShoppingBag },
  { id: 'Supermercado', label: 'Supermercado', icon: ShoppingCart },
  { id: 'Restaurantes & Delivery', label: 'Restaurantes & Delivery', icon: Utensils },
  { id: 'Servicios Financieros', label: 'Servicios Financieros', icon: Landmark },
  { id: 'Transferencias', label: 'Transferencias', icon: ArrowUpRight },
  { id: 'Transporte', label: 'Transporte', icon: Car },
  { id: 'Combustible', label: 'Combustible', icon: Fuel },
  { id: 'Servicios', label: 'Servicios', icon: Zap },
  { id: 'Suscripciones', label: 'Suscripciones', icon: Tv },
  { id: 'Salud & Farmacia', label: 'Salud & Farmacia', icon: HeartPulse },
  { id: 'Compras Online', label: 'Compras Online', icon: ShoppingBag },
  { id: 'Otros', label: 'Otros', icon: ShoppingBag },
];

const STATUSES = [
  { id: '', label: 'Todos los Estados' },
  { id: 'Aprobada', label: '✅ Aprobadas' },
  { id: 'Rechazada', label: '❌ Rechazadas' },
];

export const FilterDrawer: React.FC<FilterDrawerProps> = ({
  isOpen,
  onClose,
  organizationFilter,
  setOrganizationFilter,
  typeFilter,
  setTypeFilter,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  setStatusFilter,
  onResetFilters,
  totalResults,
  onExport,
}) => {
  if (!isOpen) return null;

  const activeCount = [
    organizationFilter ? 1 : 0,
    typeFilter ? 1 : 0,
    categoryFilter ? 1 : 0,
    statusFilter ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end">
      {/* Dark Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container (Bottom Sheet on Mobile, Slide-over on Desktop) */}
      <div className="relative w-full sm:max-w-md bg-card border-t sm:border-t-0 sm:border-l border-border shadow-2xl rounded-t-3xl sm:rounded-none max-h-[88vh] sm:max-h-full flex flex-col z-50 animate-in slide-in-from-bottom sm:slide-in-from-right duration-300">
        
        {/* Mobile Drag Indicator Handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-foreground">Filtros</h3>
                {activeCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    {activeCount} activo{activeCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Personaliza la vista de tus transacciones</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onResetFilters}
                className="h-8 text-xs text-muted-foreground hover:text-destructive gap-1 px-2.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Restablecer</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* 1. Entidad / Banco */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Entidad / Banco
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ORGANIZATIONS.map((org) => {
                const isSelected = organizationFilter === org.id;
                return (
                  <button
                    key={org.id}
                    onClick={() => setOrganizationFilter(org.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'border-border/60 bg-muted/20 hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    <span className="truncate">{org.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 flex-shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Tipo de Movimiento */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Tipo de Movimiento
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TRANSACTION_TYPES.map((type) => {
                const isSelected = typeFilter === type.id;
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setTypeFilter(type.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
                      isSelected
                        ? `${type.activeColor || 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'} shadow-sm`
                        : 'border-border/60 bg-muted/20 hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{type.label}</span>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 flex-shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Categorías */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Categoría
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => {
                const isSelected = categoryFilter === cat.id;
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'border-border/60 bg-muted/20 hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Estado de la Transacción */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Estado
            </label>
            <div className="grid grid-cols-3 gap-2">
              {STATUSES.map((st) => {
                const isSelected = statusFilter === st.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => setStatusFilter(st.id)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'border-border/60 bg-muted/20 hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Mobile Export Action */}
          {onExport && (
            <div className="pt-2 border-t border-border/40">
              <Button
                variant="outline"
                onClick={() => {
                  onClose();
                  onExport();
                }}
                className="w-full h-10 gap-2 text-xs font-semibold border-border/70 text-foreground hover:bg-muted"
              >
                <Download className="h-4 w-4 text-emerald-500" />
                <span>Exportar lista filtrada a CSV</span>
              </Button>
            </div>
          )}

        </div>

        {/* Sticky Footer */}
        <div className="p-4 border-t border-border/60 bg-card/95 backdrop-blur flex items-center gap-2">
          {activeCount > 0 && (
            <Button
              variant="outline"
              onClick={onResetFilters}
              className="h-11 px-4 text-xs font-semibold border-border/70"
            >
              Limpiar
            </Button>
          )}
          <Button
            onClick={onClose}
            className="h-11 flex-1 font-bold text-xs gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
          >
            <Check className="h-4 w-4" />
            <span>Ver {totalResults} {totalResults === 1 ? 'Movimiento' : 'Movimientos'}</span>
          </Button>
        </div>

      </div>
    </div>
  );
};
