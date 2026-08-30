import type { PeriodSelection } from '@/entities/period';
import { DatePickerField, type DatePickerQuickAction } from '@/shared/ui';
import { currentLocalDateTime } from '@/shared/lib';
import { periodDescription, rangeForSelection, usePeriodFilterDialog, type PeriodPreset } from '../model/usePeriodFilterDialog';

interface PeriodFilterProps {
  currentSelection: PeriodSelection;
  onApply: (selection: PeriodSelection) => void;
}

const presets: Array<{ id: PeriodPreset; label: string }> = [
  { id: 'today', label: 'Hoy' },
  { id: 'yesterday', label: 'Ayer' },
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
  { id: 'this_month', label: 'Este mes' },
  { id: 'last_month', label: 'Mes anterior' },
  { id: 'all', label: 'Todo' },
];

export const PeriodFilter = ({ currentSelection, onApply }: PeriodFilterProps) => {
  const model = usePeriodFilterDialog(onApply);
  const quickActions: DatePickerQuickAction[] = presets.map((preset) => ({
    ...preset,
    onSelect: () => model.applyPreset(preset.id),
  }));
  return (
    <DatePickerField mode="range" value={rangeForSelection(currentSelection)} onChange={model.applyRange} maxDate={currentLocalDateTime().split('T')[0]} triggerLabel={currentSelection.label || 'Seleccionar período'} triggerDescription={periodDescription(currentSelection)} quickActions={quickActions} tourId="period" className="w-full sm:min-w-72" />
  );
};
