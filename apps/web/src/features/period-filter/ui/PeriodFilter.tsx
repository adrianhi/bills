import { Calendar, ChevronDown } from 'lucide-react';
import type { PeriodSelection } from '@/entities/period';
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui';
import { type PeriodTab, usePeriodFilterDialog } from '../model/usePeriodFilterDialog';
import { DateRangePanel, MonthsPanel, PeriodDialogTitle, SingleDayPanel } from './PeriodCustomPanels';
import { PeriodPresetPanel } from './PeriodPresetPanel';

interface PeriodFilterProps {
  currentSelection: PeriodSelection;
  onApply: (selection: PeriodSelection) => void;
}

const tabs: Array<{ id: PeriodTab; label: string }> = [
  { id: 'presets', label: 'Rápidos' },
  { id: 'single_day', label: 'Día' },
  { id: 'date_range', label: 'Lapso' },
  { id: 'months', label: 'Meses' },
];

export const PeriodFilter = ({ currentSelection, onApply }: PeriodFilterProps) => {
  const model = usePeriodFilterDialog(onApply);
  return (
    <>
      <button type="button" onClick={() => model.setIsOpen(true)} className="flex max-w-full cursor-pointer select-none items-center gap-2 truncate rounded-xl border border-border/80 bg-card/80 px-3 py-1.5 text-xs font-semibold shadow-sm transition-all hover:bg-accent/40 active:scale-95" title="Cambiar fecha o lapso de tiempo">
        <Calendar className="h-4 w-4 flex-shrink-0 text-emerald-500" /><span className="truncate">{currentSelection.label || 'Seleccionar Período'}</span><ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
      </button>
      <Dialog open={model.isOpen} onOpenChange={model.setIsOpen}>
        <DialogContent className="w-[95vw] overflow-hidden rounded-2xl border-border bg-card p-0 shadow-2xl sm:max-w-md">
          <DialogHeader className="border-b border-border/60 p-4 pb-3 sm:p-5">
            <DialogTitle className="sr-only">Filtrar por período</DialogTitle>
            <PeriodDialogTitle />
            <div className="mt-3 grid grid-cols-4 gap-1 rounded-xl bg-muted/60 p-1 text-xs font-medium">
              {tabs.map((tab) => <button key={tab.id} type="button" onClick={() => model.setActiveTab(tab.id)} className={`rounded-lg px-2 py-1.5 text-center transition-all ${model.activeTab === tab.id ? 'bg-background font-semibold text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{tab.label}</button>)}
            </div>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto p-4 sm:p-5">
            {model.activeTab === 'presets' && <PeriodPresetPanel onSelect={model.applyPreset} />}
            {model.activeTab === 'single_day' && <SingleDayPanel value={model.singleDate} onChange={model.setSingleDate} onApply={model.applySingleDay} />}
            {model.activeTab === 'date_range' && <DateRangePanel start={model.rangeStart} end={model.rangeEnd} onStartChange={model.setRangeStart} onEndChange={model.setRangeEnd} onApply={model.applyRange} />}
            {model.activeTab === 'months' && <MonthsPanel months={model.months} selected={currentSelection.month} onSelect={model.applyMonth} />}
          </div>
          <DialogFooter className="border-t border-border/60 bg-muted/20 p-3 sm:p-4"><Button type="button" variant="ghost" size="sm" onClick={() => model.setIsOpen(false)} className="w-full text-xs text-muted-foreground hover:text-foreground">Cerrar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
