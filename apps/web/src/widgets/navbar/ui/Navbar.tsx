import { 
  Moon, 
  Sun, 
  Download, 
  RefreshCw, 
  SlidersHorizontal,
  Lock,
  Plus,
  Eye,
  EyeOff,
  Settings
} from 'lucide-react';
import { Button } from '@/shared/ui';

import { PeriodFilter, type PeriodSelection } from '@/features/period-filter';

interface NavbarProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  hideBalances: boolean;
  setHideBalances: (val: boolean) => void;
  currentPeriod: PeriodSelection;
  onApplyPeriod: (selection: PeriodSelection) => void;
  currency: string;
  setCurrency: (curr: string) => void;
  onRefresh: () => void;
  onOpenRules: () => void;
  onQuickAdd: () => void;
  onExport: () => void;
  onLock: () => void;
  onOpenSettings: () => void;
  loading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  darkMode,
  setDarkMode,
  hideBalances,
  setHideBalances,
  currentPeriod,
  onApplyPeriod,
  currency,
  setCurrency,
  onRefresh,
  onOpenRules,
  onQuickAdd,
  onExport,
  onLock,
  onOpenSettings,
  loading,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-3 px-4 py-2.5 sm:px-6 max-w-7xl">
        
        {/* Brand & Mobile Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 text-white shadow-md shadow-emerald-500/20 font-bold text-lg tracking-tighter">
              b.
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-lg">bills<span className="text-emerald-500">.</span></span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Multi-Bank
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground hidden sm:block">Control de Gastos & Automatización</p>
            </div>
          </div>

          {/* Mobile Actions */}
          <div className="flex items-center gap-1 md:hidden">
            <Button variant="ghost" size="icon" onClick={onOpenSettings} className="h-8 w-8 text-muted-foreground" title="Privacidad y conexiones">
              <Settings className="h-4 w-4" />
            </Button>
            {/* Privacy Mode Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setHideBalances(!hideBalances)}
              className="h-8 w-8 text-muted-foreground"
              title={hideBalances ? 'Mostrar balances' : 'Ocultar balances'}
            >
              {hideBalances ? <EyeOff className="h-4 w-4 text-emerald-500" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDarkMode(!darkMode)}
              className="h-8 w-8"
            >
              {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onLock}
              className="h-8 w-8 text-muted-foreground"
              title="Bloquear sesión"
            >
              <Lock className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          
          {/* Mobile-First Period Filter (Day, Range, Presets) */}
          <PeriodFilter currentSelection={currentPeriod} onApply={onApplyPeriod} />

          {/* Currency Switcher */}
          <div className="flex rounded-lg border bg-muted p-0.5 text-xs font-semibold">
            <button
              onClick={() => setCurrency('DOP')}
              className={`rounded-md px-2.5 py-1 transition-all ${
                currency === 'DOP'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              RD$ DOP
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`rounded-md px-2.5 py-1 transition-all ${
                currency === 'USD'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              $ USD
            </button>
          </div>

          {/* Quick Add Button (Desktop) */}
          <Button
            size="sm"
            onClick={onQuickAdd}
            className="hidden sm:inline-flex gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/20 font-semibold"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nuevo Movimiento</span>
          </Button>

          {/* Rules Manager Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenRules}
            className="hidden sm:inline-flex gap-1.5 h-9"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Reglas</span>
          </Button>

          {/* Export Button (Desktop only, mobile has it in Filter Drawer / Actions) */}
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="hidden md:inline-flex gap-1.5 h-9"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Exportar</span>
          </Button>

          {/* Desktop Refresh & Theme & Privacy & Lock */}
          <div className="hidden md:flex items-center gap-1.5 border-l pl-2.5 ml-1">
            <Button variant="ghost" size="icon" onClick={onOpenSettings} className="h-9 w-9 rounded-lg" title="Privacidad y conexiones">
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setHideBalances(!hideBalances)}
              className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
              title={hideBalances ? 'Mostrar balances' : 'Ocultar balances (Modo Privacidad)'}
            >
              {hideBalances ? <EyeOff className="h-4 w-4 text-emerald-500" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              disabled={loading}
              className="h-9 w-9 rounded-lg"
              title="Actualizar datos"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDarkMode(!darkMode)}
              className="h-9 w-9 rounded-lg"
              title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onLock}
              className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
              title="Bloquear sesión"
            >
              <Lock className="h-4 w-4" />
            </Button>
          </div>

        </div>
      </div>
    </header>
  );
};
