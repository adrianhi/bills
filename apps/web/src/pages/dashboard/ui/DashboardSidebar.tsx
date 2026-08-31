import React from 'react';
import { Plus } from 'lucide-react';
import { APP_SECTIONS, type AppSection } from '@/widgets/bottom-nav';
import { Button } from '@/shared/ui';

interface DashboardSidebarProps {
  activeSection: AppSection;
  onSelectSection: (section: AppSection) => void;
  onQuickAdd: () => void;
  activeFiltersCount?: number;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  activeSection,
  onSelectSection,
  onQuickAdd,
  activeFiltersCount = 0,
}) => {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r bg-card lg:flex">
      <div className="flex h-20 items-center gap-3 border-b px-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-lg font-black text-white shadow-md">
          b.
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xl font-black tracking-tight">
              bills<span className="text-primary">.</span>
            </p>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
              Beta privada
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Finanzas sin ruido</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-4" aria-label="Navegación principal">
        {APP_SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelectSection(id)}
            aria-current={id === activeSection ? 'page' : undefined}
            className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${
              id === activeSection
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Icon className="h-5 w-5" />
            {label}
            {id === 'transactions' && activeFiltersCount > 0 && (
              <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">
                {activeFiltersCount}
              </span>
            )}
          </button>
        ))}
      </nav>
      <div className="border-t p-4">
        <Button
          onClick={onQuickAdd}
          data-product-tour="new-movement"
          className="h-11 w-full gap-2 rounded-xl"
        >
          <Plus className="h-4 w-4" />
          Nuevo movimiento
        </Button>
      </div>
    </aside>
  );
};
