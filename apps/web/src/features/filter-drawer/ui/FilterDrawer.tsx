import type { FC } from 'react';
import { Download, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/shared/ui';
import { categoryOptions, movementTypeOptions, organizationOptions, statusOptions } from '../model/filter-options';
import { useDragToDismiss } from '../model/useDragToDismiss';
import { FilterOptionSection } from './FilterOptionSection';

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

export const FilterDrawer: FC<FilterDrawerProps> = ({
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
  const { dragY, isDragging, handlers } = useDragToDismiss(onClose);

  if (!isOpen) return null;

  const activeCount = [
    organizationFilter ? 1 : 0,
    typeFilter ? 1 : 0,
    categoryFilter ? 1 : 0,
    statusFilter ? 1 : 0,
  ].reduce((acc, curr) => acc + curr, 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-stretch sm:justify-end">
      {/* Dark Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity z-[100]" 
        onClick={onClose} 
      />

      {/* Drawer Container (Bottom Sheet on Mobile, Slide-over on Desktop) */}
      <div
        className={`relative z-[101] flex max-h-[88vh] w-full flex-col rounded-t-3xl border-border border-t bg-card shadow-2xl sm:max-h-full sm:max-w-md sm:rounded-none sm:border-t-0 sm:border-l ${
          isDragging ? 'transition-none' : 'transition-transform duration-300'
        }`}
        style={{ transform: dragY > 0 ? `translateY(${dragY}px)` : undefined }}
      >
        {/* Mobile Drag Indicator Handle */}
        <div
          className="flex cursor-grab select-none flex-col items-center justify-center pt-3 pb-2 touch-none active:cursor-grabbing sm:hidden"
          {...handlers}
          onClick={onClose}
          title="Arrastra hacia abajo o toca para cerrar"
        >
          <div className="h-1.5 w-12 rounded-full bg-muted-foreground/40 transition-colors active:bg-emerald-500" />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between border-b border-border/60 px-5 py-3.5 select-none touch-none"
          {...handlers}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">Filtros</h3>
                {activeCount > 0 && (
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
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
                className="h-8 gap-1 px-2.5 text-xs text-muted-foreground hover:text-destructive"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Restablecer</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 cursor-pointer rounded-full hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 space-y-6 overflow-y-auto p-5 pb-10">
          <FilterOptionSection
            title="Entidad / Banco"
            options={organizationOptions}
            selected={organizationFilter}
            onSelect={setOrganizationFilter}
          />
          <FilterOptionSection
            title="Tipo de Movimiento"
            options={movementTypeOptions}
            selected={typeFilter}
            onSelect={setTypeFilter}
          />
          <FilterOptionSection
            title="Categoría"
            options={categoryOptions}
            selected={categoryFilter}
            onSelect={setCategoryFilter}
          />
          <FilterOptionSection
            title="Estado"
            options={statusOptions}
            selected={statusFilter}
            onSelect={setStatusFilter}
            columns="grid-cols-2 sm:grid-cols-3"
          />

          {onExport && (
            <div className="border-t border-border/40 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  onClose();
                  onExport();
                }}
                className="h-10 w-full cursor-pointer gap-2 border-border/70 text-xs font-semibold text-foreground hover:bg-muted"
              >
                <Download className="h-4 w-4 text-emerald-500" />
                <span>Exportar lista filtrada a CSV</span>
              </Button>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="flex items-center gap-2 border-t border-border/60 bg-card/95 p-4 backdrop-blur">
          {activeCount > 0 && (
            <Button
              variant="outline"
              onClick={onResetFilters}
              className="h-11 cursor-pointer border-border/70 px-4 text-xs font-semibold"
            >
              Limpiar
            </Button>
          )}
          <Button
            onClick={onClose}
            className="h-11 flex-1 cursor-pointer gap-2 bg-emerald-600 text-xs font-bold text-white shadow-emerald-500/20 shadow-lg hover:bg-emerald-500"
          >
            Ver {totalResults} {totalResults === 1 ? 'Movimiento' : 'Movimientos'}
          </Button>
        </div>
      </div>
    </div>
  );
};
