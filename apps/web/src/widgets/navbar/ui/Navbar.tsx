import { Eye, EyeOff, RefreshCw, Settings } from 'lucide-react';
import { Button } from '@/shared/ui';

interface NavbarProps {
  title: string;
  hideBalances: boolean;
  setHideBalances: (value: boolean) => void;
  onRefresh: () => void;
  onOpenSettings: () => void;
  refreshing: boolean;
}

export function Navbar({ title, hideBalances, setHideBalances, onRefresh, onOpenSettings, refreshing }: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur-xl lg:pl-64">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-base font-black text-white shadow-sm lg:hidden">b.</div>
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-primary sm:text-[11px]">Beta privada <span className="hidden text-muted-foreground sm:inline">· Tu dinero, claro</span></p>
            <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl">{title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setHideBalances(!hideBalances)} className="h-11 w-11 rounded-xl" aria-label={hideBalances ? 'Mostrar balances' : 'Ocultar balances'}>
            {hideBalances ? <EyeOff className="h-4 w-4 text-primary" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onRefresh} disabled={refreshing} className="h-11 w-11 rounded-xl" aria-label="Actualizar datos">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={onOpenSettings} className="h-11 w-11 rounded-xl" aria-label="Abrir conexiones y privacidad">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
