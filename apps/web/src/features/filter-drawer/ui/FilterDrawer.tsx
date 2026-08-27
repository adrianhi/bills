import React, { useState, useRef } from 'react';
import { 
  X, 
  RotateCcw, 
  Check, 
  SlidersHorizontal,
  ArrowUpRight,
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
  { id: '', label: 'Todos los Bancos', icon: Landmark },
  { id: 'BHD', label: 'Banco BHD', dot: 'bg-emerald-500' },
  { id: 'POPULAR', label: 'Banco Popular', dot: 'bg-blue-500' },
  { id: 'BANRESERVAS', label: 'Banreservas', dot: 'bg-sky-600' },
  { id: 'QIK', label: 'Qik Banco Digital', dot: 'bg-purple-500' },
  { id: 'APAP', label: 'APAP', dot: 'bg-orange-500' },
  { id: 'SCOTIABANK', label: 'Scotiabank', dot: 'bg-red-500' },
  { id: 'MANUAL', label: 'Manual / Efectivo', dot: 'bg-slate-400' },
];

const MOVEMENT_TYPES = [
  { id: '', label: 'Todos los Tipos' },
  { id: 'recibida', label: '📥 Ingresos / Recibidas' },
  { id: 'compra', label: '💳 Compras con Tarjeta' },
  { id: 'transferencia', label: '↗️ Transf. Enviadas' },
  { id: 'pago', label: '🧾 Pagos de Servicios' },
  { id: 'retiro', label: '🏧 Retiros de Cajero' },
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
  { id: 'APPROVED', label: '✅ Aprobadas' },
  { id: 'DECLINED', label: '❌ Rechazadas' },
  { id: 'REVERSED', label: '↩️ Reversadas' },
  { id: 'PENDING', label: '⏳ Pendientes' },
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
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);

  if (!isOpen) return null;

  const activeCount = [
    organizationFilter ? 1 : 0,
    typeFilter ? 1 : 0,
    categoryFilter ? 1 : 0,
    statusFilter ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // Touch handlers for drag-to-dismiss gesture
  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;
    if (diff > 0) {
      setDragY(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragY > 70) {
      onClose();
      setDragY(0);
    } else {
      setDragY(0);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-stretch sm:justify-end">
      {/* Dark Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity z-[100]"
        onClick={onClose}
      />

      {/* Drawer Container (Bottom Sheet on Mobile, Slide-over on Desktop) */}
      <div 
        className={`relative w-full sm:max-w-md bg-card border-t sm:border-t-0 sm:border-l border-border shadow-2xl rounded-t-3xl sm:rounded-none max-h-[88vh] sm:max-h-full flex flex-col z-[101] ${
          isDragging ? 'transition-none' : 'transition-transform duration-300'
        }`}
        style={{
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
        }}
      >
        
        {/* Mobile Drag Indicator Handle with Touch Gesture & Click to Close */}
        <div 
          className="sm:hidden flex flex-col items-center justify-center pt-3 pb-2 touch-none cursor-grab active:cursor-grabbing select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={onClose}
          title="Arrastra hacia abajo o toca para cerrar"
        >
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/40 active:bg-emerald-500 transition-colors" />
        </div>

        {/* Header (Also supports drag to close) */}
        <div 
          className="flex items-center justify-between px-5 py-3.5 border-b border-border/60 select-none touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
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
              className="h-8 w-8 rounded-full cursor-pointer hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 pb-10 space-y-6">
          
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
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold'
                        : 'border-border/60 bg-muted/20 hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    {org.dot && <span className={`h-2.5 w-2.5 rounded-full ${org.dot}`} />}
                    {org.icon && <org.icon className="h-3.5 w-3.5 text-muted-foreground" />}
                    <span className="truncate">{org.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 ml-auto text-emerald-500 shrink-0" />}
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
              {MOVEMENT_TYPES.map((type) => {
                const isSelected = typeFilter === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => setTypeFilter(type.id)}
                    className={`p-2.5 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer truncate ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold'
                        : 'border-border/60 bg-muted/20 hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    <span className="truncate">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Categoría */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Categoría
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = categoryFilter === cat.id;
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-sm font-bold'
                        : 'border-border/60 bg-muted/20 hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                    <span className="truncate">{cat.label}</span>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                className="w-full h-10 gap-2 text-xs font-semibold border-border/70 text-foreground hover:bg-muted cursor-pointer"
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
              className="h-11 px-4 text-xs font-semibold border-border/70 cursor-pointer"
            >
              Limpiar
            </Button>
          )}
          <Button
            onClick={onClose}
            className="h-11 flex-1 font-bold text-xs gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <Check className="h-4 w-4" />
            <span>Ver {totalResults} {totalResults === 1 ? 'Movimiento' : 'Movimientos'}</span>
          </Button>
        </div>

      </div>
    </div>
  );
};
