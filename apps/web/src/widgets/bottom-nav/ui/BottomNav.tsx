import React from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  BarChart3, 
  Plus
} from 'lucide-react';

export type ActiveSection = 'overview' | 'analytics' | 'transactions';

interface BottomNavProps {
  activeSection: ActiveSection;
  onSelectSection: (section: ActiveSection) => void;
  onQuickAdd: () => void;
  activeFiltersCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeSection,
  onSelectSection,
  onQuickAdd,
  activeFiltersCount = 0,
}) => {
  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden pointer-events-none">
      <div 
        className="pointer-events-auto flex items-center gap-4 sm:gap-6 px-6 py-2.5 rounded-full bg-white/80 dark:bg-card/75 backdrop-blur-3xl saturate-150 border border-white/40 dark:border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.55)] transition-all duration-300"
      >
        
        {/* 1. Inicio / Overview */}
        <button
          onClick={() => onSelectSection('overview')}
          className="flex flex-col items-center justify-center min-w-[50px] transition-transform active:scale-95 cursor-pointer group"
          title="Inicio"
        >
          <div className={`flex items-center justify-center h-7 w-7 rounded-full transition-all duration-300 ${
            activeSection === 'overview'
              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 ring-2 ring-emerald-500/30'
              : 'text-foreground/80 dark:text-foreground/70 group-hover:text-foreground'
          }`}>
            <LayoutDashboard className="h-4 w-4" />
          </div>
          <span className={`text-[10px] mt-0.5 tracking-tight transition-colors ${
            activeSection === 'overview'
              ? 'font-bold text-emerald-600 dark:text-emerald-400'
              : 'font-medium text-muted-foreground group-hover:text-foreground'
          }`}>
            Inicio
          </span>
        </button>

        {/* 2. Movimientos & Filtros */}
        <button
          onClick={() => onSelectSection('transactions')}
          className="flex flex-col items-center justify-center min-w-[50px] transition-transform active:scale-95 cursor-pointer group relative"
          title="Movimientos y Filtros"
        >
          <div className={`relative flex items-center justify-center h-7 w-7 rounded-full transition-all duration-300 ${
            activeSection === 'transactions'
              ? 'text-sky-600 dark:text-sky-400 bg-sky-500/15 ring-2 ring-sky-500/30'
              : 'text-foreground/80 dark:text-foreground/70 group-hover:text-foreground'
          }`}>
            <Receipt className="h-4 w-4" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-sky-500 ring-2 ring-background" />
            )}
          </div>
          <span className={`text-[10px] mt-0.5 tracking-tight transition-colors ${
            activeSection === 'transactions'
              ? 'font-bold text-sky-600 dark:text-sky-400'
              : 'font-medium text-muted-foreground group-hover:text-foreground'
          }`}>
            Movimientos
          </span>
        </button>

        {/* 3. Analítica / Gráficos */}
        <button
          onClick={() => onSelectSection('analytics')}
          className="flex flex-col items-center justify-center min-w-[50px] transition-transform active:scale-95 cursor-pointer group"
          title="Analítica y Gráficos"
        >
          <div className={`flex items-center justify-center h-7 w-7 rounded-full transition-all duration-300 ${
            activeSection === 'analytics'
              ? 'text-amber-600 dark:text-amber-400 bg-amber-500/15 ring-2 ring-amber-500/30'
              : 'text-foreground/80 dark:text-foreground/70 group-hover:text-foreground'
          }`}>
            <BarChart3 className="h-4 w-4" />
          </div>
          <span className={`text-[10px] mt-0.5 tracking-tight transition-colors ${
            activeSection === 'analytics'
              ? 'font-bold text-amber-600 dark:text-amber-400'
              : 'font-medium text-muted-foreground group-hover:text-foreground'
          }`}>
            Analítica
          </span>
        </button>

        {/* Subtle Vertical Divider (Apple Style) */}
        <div className="h-8 w-[1px] bg-border/60 dark:bg-white/10" />

        {/* 4. Action Button: Nuevo Movimiento (Apple Bag Style) */}
        <button
          onClick={onQuickAdd}
          className="flex flex-col items-center justify-center transition-transform active:scale-90 cursor-pointer group"
          title="Registrar Nuevo Movimiento"
        >
          <div className="flex items-center justify-center h-9 w-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/25 border border-emerald-400/30">
            <Plus className="h-5 w-5 stroke-[2.5]" />
          </div>
          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 tracking-tight">
            Nuevo
          </span>
        </button>

      </div>
    </nav>
  );
};
