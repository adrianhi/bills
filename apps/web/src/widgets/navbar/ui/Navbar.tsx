import React from 'react';
import { 
  Moon, 
  Sun, 
  Download, 
  Calendar, 
  RefreshCw, 
  SlidersHorizontal,
  Lock
} from 'lucide-react';
import { Button } from '@/shared/ui';

interface NavbarProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  currency: string;
  setCurrency: (curr: string) => void;
  onRefresh: () => void;
  onOpenRules: () => void;
  onExport: () => void;
  onLock: () => void;
  loading: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  darkMode,
  setDarkMode,
  selectedMonth,
  setSelectedMonth,
  currency,
  setCurrency,
  onRefresh,
  onOpenRules,
  onExport,
  onLock,
  loading,
}) => {
  const months = React.useMemo(() => {
    const list: Array<{ value: string; label: string }> = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' });
      list.push({ value: val, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return list;
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4 px-4 py-3 sm:px-6 max-w-7xl">
        
        {/* Brand */}
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
              <p className="text-xs text-muted-foreground">Control de Gastos & Automatización</p>
            </div>
          </div>

          {/* Mobile Actions */}
          <div className="flex items-center gap-1 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDarkMode(!darkMode)}
              className="h-9 w-9"
            >
              {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onLock}
              className="h-9 w-9 text-muted-foreground"
              title="Bloquear sesión"
            >
              <Lock className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          
          {/* Month Selector */}
          <div className="flex items-center rounded-lg border bg-card px-2.5 py-1 text-sm shadow-sm">
            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-medium focus:outline-none cursor-pointer"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value} className="bg-popover text-popover-foreground">
                  {m.label}
                </option>
              ))}
            </select>
          </div>

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

          {/* Export Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="gap-1.5 h-9"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>

          {/* Desktop Refresh & Theme & Lock */}
          <div className="hidden md:flex items-center gap-1.5 border-l pl-2.5 ml-1">
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
