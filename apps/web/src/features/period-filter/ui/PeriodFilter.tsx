import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  ChevronDown, 
  Clock, 
  CalendarDays, 
  CalendarRange, 
  Sparkles, 
  Check, 
  ArrowRight
} from 'lucide-react';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui';

export interface PeriodSelection {
  startDate?: string;
  endDate?: string;
  month?: string;
  label: string;
}

interface PeriodFilterProps {
  currentSelection: PeriodSelection;
  onApply: (selection: PeriodSelection) => void;
}

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getYesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getDaysAgoStr = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getCurrentMonthStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const getLastMonthStr = () => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const formatReadableDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-DO', { day: 'numeric', month: 'short' });
};

const formatReadableMonth = (monthStr: string) => {
  if (!monthStr) return '';
  const [y, m] = monthStr.split('-').map(Number);
  const date = new Date(y, m - 1, 1);
  const formatted = date.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

export const PeriodFilter: React.FC<PeriodFilterProps> = ({ currentSelection, onApply }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'presets' | 'single_day' | 'date_range' | 'months'>('presets');
  
  // Custom inputs state
  const [singleDate, setSingleDate] = useState<string>(getTodayStr());
  const [rangeStart, setRangeStart] = useState<string>(getDaysAgoStr(7));
  const [rangeEnd, setRangeEnd] = useState<string>(getTodayStr());

  // Available past 12 months
  const monthsList = useMemo(() => {
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

  const handleSelectPreset = (type: 'today' | 'yesterday' | '7d' | '30d' | 'this_month' | 'last_month' | 'all') => {
    if (type === 'today') {
      const today = getTodayStr();
      onApply({
        startDate: today,
        endDate: today,
        label: `Hoy (${formatReadableDate(today)})`,
      });
    } else if (type === 'yesterday') {
      const yest = getYesterdayStr();
      onApply({
        startDate: yest,
        endDate: yest,
        label: `Ayer (${formatReadableDate(yest)})`,
      });
    } else if (type === '7d') {
      const start = getDaysAgoStr(7);
      const end = getTodayStr();
      onApply({
        startDate: start,
        endDate: end,
        label: `Últimos 7 días`,
      });
    } else if (type === '30d') {
      const start = getDaysAgoStr(30);
      const end = getTodayStr();
      onApply({
        startDate: start,
        endDate: end,
        label: `Últimos 30 días`,
      });
    } else if (type === 'this_month') {
      const m = getCurrentMonthStr();
      onApply({
        month: m,
        label: formatReadableMonth(m),
      });
    } else if (type === 'last_month') {
      const m = getLastMonthStr();
      onApply({
        month: m,
        label: formatReadableMonth(m),
      });
    } else if (type === 'all') {
      onApply({
        label: 'Todo el Histórico',
      });
    }
    setIsOpen(false);
  };

  const handleApplySingleDay = () => {
    if (!singleDate) return;
    onApply({
      startDate: singleDate,
      endDate: singleDate,
      label: `${formatReadableDate(singleDate)} ${singleDate.split('-')[0]}`,
    });
    setIsOpen(false);
  };

  const handleApplyDateRange = () => {
    if (!rangeStart || !rangeEnd) return;
    const start = rangeStart <= rangeEnd ? rangeStart : rangeEnd;
    const end = rangeStart <= rangeEnd ? rangeEnd : rangeStart;
    onApply({
      startDate: start,
      endDate: end,
      label: `${formatReadableDate(start)} — ${formatReadableDate(end)}`,
    });
    setIsOpen(false);
  };

  const handleApplyMonth = (m: string) => {
    onApply({
      month: m,
      label: formatReadableMonth(m),
    });
    setIsOpen(false);
  };

  return (
    <>
      {/* Trigger Button - Mobile First & Touch Friendly */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-border/80 bg-card/80 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm hover:bg-accent/40 active:scale-95 transition-all cursor-pointer select-none max-w-full truncate"
        title="Cambiar fecha o lapso de tiempo"
      >
        <Calendar className="h-4 w-4 text-emerald-500 flex-shrink-0" />
        <span className="truncate">{currentSelection.label || 'Seleccionar Período'}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
      </button>

      {/* Responsive Modal / Drawer */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md w-[95vw] p-0 overflow-hidden rounded-2xl bg-card border-border shadow-2xl">
          <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">Filtrar por Período</DialogTitle>
                  <p className="text-xs text-muted-foreground">Selecciona un día, lapso de fechas o mes</p>
                </div>
              </div>
            </div>

            {/* Mobile Tab Switcher */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-muted/60 rounded-xl mt-3 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('presets')}
                className={`py-1.5 px-2 rounded-lg transition-all text-center ${
                  activeTab === 'presets'
                    ? 'bg-background text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Rápidos
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('single_day')}
                className={`py-1.5 px-2 rounded-lg transition-all text-center ${
                  activeTab === 'single_day'
                    ? 'bg-background text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Día
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('date_range')}
                className={`py-1.5 px-2 rounded-lg transition-all text-center ${
                  activeTab === 'date_range'
                    ? 'bg-background text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Lapso
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('months')}
                className={`py-1.5 px-2 rounded-lg transition-all text-center ${
                  activeTab === 'months'
                    ? 'bg-background text-foreground shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Meses
              </button>
            </div>
          </DialogHeader>

          <div className="p-4 sm:p-5 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* 1. Presets Rápidos */}
            {activeTab === 'presets' && (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleSelectPreset('today')}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/30 hover:bg-emerald-500/10 hover:border-emerald-500/30 active:scale-95 transition-all text-left group"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-xs text-foreground group-hover:text-emerald-500">Hoy</div>
                    <div className="text-[11px] text-muted-foreground">{formatReadableDate(getTodayStr())}</div>
                  </div>
                  <Sparkles className="h-4 w-4 text-emerald-500 opacity-60 group-hover:opacity-100" />
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPreset('yesterday')}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/30 hover:bg-emerald-500/10 hover:border-emerald-500/30 active:scale-95 transition-all text-left group"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-xs text-foreground group-hover:text-emerald-500">Ayer</div>
                    <div className="text-[11px] text-muted-foreground">{formatReadableDate(getYesterdayStr())}</div>
                  </div>
                  <Clock className="h-4 w-4 text-muted-foreground group-hover:text-emerald-500" />
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPreset('7d')}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/30 hover:bg-emerald-500/10 hover:border-emerald-500/30 active:scale-95 transition-all text-left group"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-xs text-foreground group-hover:text-emerald-500">Últimos 7 días</div>
                    <div className="text-[11px] text-muted-foreground">Semana actual</div>
                  </div>
                  <CalendarDays className="h-4 w-4 text-sky-500 opacity-60 group-hover:opacity-100" />
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPreset('30d')}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/30 hover:bg-emerald-500/10 hover:border-emerald-500/30 active:scale-95 transition-all text-left group"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-xs text-foreground group-hover:text-emerald-500">Últimos 30 días</div>
                    <div className="text-[11px] text-muted-foreground">Mes móvil</div>
                  </div>
                  <CalendarRange className="h-4 w-4 text-amber-500 opacity-60 group-hover:opacity-100" />
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPreset('this_month')}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/30 hover:bg-emerald-500/10 hover:border-emerald-500/30 active:scale-95 transition-all text-left group"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-xs text-foreground group-hover:text-emerald-500">Este Mes</div>
                    <div className="text-[11px] text-muted-foreground">{formatReadableMonth(getCurrentMonthStr())}</div>
                  </div>
                  <Calendar className="h-4 w-4 text-emerald-500 opacity-60 group-hover:opacity-100" />
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPreset('last_month')}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/30 hover:bg-emerald-500/10 hover:border-emerald-500/30 active:scale-95 transition-all text-left group"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-xs text-foreground group-hover:text-emerald-500">Mes Anterior</div>
                    <div className="text-[11px] text-muted-foreground">{formatReadableMonth(getLastMonthStr())}</div>
                  </div>
                  <Calendar className="h-4 w-4 text-indigo-500 opacity-60 group-hover:opacity-100" />
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPreset('all')}
                  className="col-span-2 flex items-center justify-center gap-2 p-2.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/60 active:scale-95 transition-all text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  <span>Ver Todo el Histórico de Movimientos</span>
                </button>
              </div>
            )}

            {/* 2. Día Específico */}
            {activeTab === 'single_day' && (
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Selecciona el día exacto:</span>
                  </label>
                  <input
                    type="date"
                    value={singleDate}
                    onChange={(e) => setSingleDate(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-input bg-background text-foreground text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSingleDate(getTodayStr())}
                    className="flex-1 py-2 px-3 rounded-lg border border-border bg-muted/40 text-xs font-medium hover:bg-muted active:scale-95 transition-all text-center cursor-pointer"
                  >
                    Hoy
                  </button>
                  <button
                    type="button"
                    onClick={() => setSingleDate(getYesterdayStr())}
                    className="flex-1 py-2 px-3 rounded-lg border border-border bg-muted/40 text-xs font-medium hover:bg-muted active:scale-95 transition-all text-center cursor-pointer"
                  >
                    Ayer
                  </button>
                </div>

                <Button
                  type="button"
                  onClick={handleApplySingleDay}
                  className="w-full h-11 font-semibold gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <Check className="h-4 w-4" />
                  <span>Aplicar Filtro para el {formatReadableDate(singleDate)}</span>
                </Button>
              </div>
            )}

            {/* 3. Lapso / Rango de Días */}
            {activeTab === 'date_range' && (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Desde (Fecha inicio)</label>
                    <input
                      type="date"
                      value={rangeStart}
                      onChange={(e) => setRangeStart(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-input bg-background text-foreground text-xs font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Hasta (Fecha fin)</label>
                    <input
                      type="date"
                      value={rangeEnd}
                      onChange={(e) => setRangeEnd(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-input bg-background text-foreground text-xs font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Range summary preview */}
                <div className="p-3 rounded-xl bg-muted/30 border border-border/40 text-center text-xs font-medium text-muted-foreground flex items-center justify-center gap-2">
                  <span className="font-semibold text-foreground">{formatReadableDate(rangeStart)}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="font-semibold text-foreground">{formatReadableDate(rangeEnd)}</span>
                </div>

                <Button
                  type="button"
                  onClick={handleApplyDateRange}
                  className="w-full h-11 font-semibold gap-2 shadow-lg shadow-emerald-500/20"
                >
                  <Check className="h-4 w-4" />
                  <span>Aplicar Lapso de Fechas</span>
                </Button>
              </div>
            )}

            {/* 4. Selector de Meses Históricos */}
            {activeTab === 'months' && (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {monthsList.map((m) => {
                    const isSelected = currentSelection.month === m.value;
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => handleApplyMonth(m.value)}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all text-left cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                            : 'border-border/60 bg-muted/30 hover:bg-muted/70 text-foreground'
                        }`}
                      >
                        <span>{m.label}</span>
                        {isSelected && <Check className="h-4 w-4 text-emerald-500" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          <DialogFooter className="p-3 sm:p-4 border-t border-border/60 bg-muted/20">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="w-full text-xs text-muted-foreground hover:text-foreground"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
