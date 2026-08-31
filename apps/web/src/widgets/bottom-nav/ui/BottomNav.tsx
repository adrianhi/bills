import { Plus } from 'lucide-react';
import { APP_SECTIONS, type AppSection } from '../model/navigation';

interface BottomNavProps {
  activeSection: AppSection;
  onSelectSection: (section: AppSection) => void;
  onQuickAdd: () => void;
  activeFiltersCount?: number;
}

type NavigationItem = (typeof APP_SECTIONS)[number];

function NavItem({
  item,
  active,
  activeFiltersCount,
  onSelect,
}: {
  item: NavigationItem;
  active: boolean;
  activeFiltersCount: number;
  onSelect: (section: AppSection) => void;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className={`group relative flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-full px-0.5 text-[10px] font-semibold transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
        active ? 'text-primary' : 'text-foreground/65 hover:text-foreground dark:text-foreground/60'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      <span
        className={`relative flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 motion-reduce:transition-none ${
          active
            ? 'bg-primary/[0.12] shadow-[0_0_18px_hsl(var(--primary)/0.2)] ring-1 ring-primary/20'
            : 'group-hover:bg-foreground/5'
        }`}
      >
        <Icon className="h-[1.15rem] w-[1.15rem]" aria-hidden="true" />
        {item.id === 'transactions' && activeFiltersCount > 0 && (
          <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-none text-primary-foreground ring-2 ring-white/70 dark:ring-slate-950/70">
            {activeFiltersCount > 9 ? '9+' : activeFiltersCount}
          </span>
        )}
      </span>
      <span className="max-w-full truncate leading-tight">{item.label}</span>
    </button>
  );
}

export function BottomNav({
  activeSection,
  onSelectSection,
  onQuickAdd,
  activeFiltersCount = 0,
}: BottomNavProps) {
  const leadingItems = APP_SECTIONS.slice(0, 2);
  const trailingItems = APP_SECTIONS.slice(2);

  return (
    <nav
      className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-1/2 z-40 isolate w-[calc(100%-1.5rem)] max-w-[430px] -translate-x-1/2 lg:hidden"
      aria-label="Navegación principal"
      data-product-tour-occluder="bottom-navigation"
    >
      <div className="grid h-[4.5rem] grid-cols-[minmax(0,1fr)_minmax(0,1fr)_4rem_minmax(0,1fr)_minmax(0,1fr)] items-center rounded-full border border-white/60 bg-white/70 px-2 shadow-[0_16px_44px_rgba(15,23,42,0.22)] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/10 dark:bg-slate-950/70 dark:shadow-[0_18px_50px_rgba(0,0,0,0.55)] supports-[backdrop-filter]:bg-white/62 supports-[backdrop-filter]:dark:bg-slate-950/62">
        {leadingItems.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            active={item.id === activeSection}
            activeFiltersCount={activeFiltersCount}
            onSelect={onSelectSection}
          />
        ))}

        <button
          type="button"
          onClick={onQuickAdd}
          data-product-tour="new-movement"
          className="relative -top-2 flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-bold text-primary transition-transform active:scale-95 motion-reduce:transform-none motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          aria-label="Registrar un nuevo movimiento"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-300/40 bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 text-white shadow-[0_10px_24px_rgba(16,185,129,0.38)] ring-4 ring-white/65 dark:border-emerald-300/20 dark:ring-slate-950/65">
            <Plus className="h-6 w-6 stroke-[2.5]" aria-hidden="true" />
          </span>
          <span className="leading-tight">Nuevo</span>
        </button>

        {trailingItems.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            active={item.id === activeSection}
            activeFiltersCount={activeFiltersCount}
            onSelect={onSelectSection}
          />
        ))}
      </div>
    </nav>
  );
}
