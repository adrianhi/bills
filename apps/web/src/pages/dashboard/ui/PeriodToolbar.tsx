import React from 'react';
import { PeriodFilter } from '@/features/period-filter';

interface PeriodToolbarProps {
  currentPeriod: React.ComponentProps<typeof PeriodFilter>['currentSelection'];
  onApplyPeriod: React.ComponentProps<typeof PeriodFilter>['onApply'];
  currency: string;
  setCurrency: (currency: string) => void;
  action?: React.ReactNode;
}

export const PeriodToolbar: React.FC<PeriodToolbarProps> = ({
  currentPeriod,
  onApplyPeriod,
  currency,
  setCurrency,
  action,
}) => {
  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
      <div className="w-full sm:w-auto">
        <PeriodFilter currentSelection={currentPeriod} onApply={onApplyPeriod} />
      </div>
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <div
          className={`flex min-h-12 ${action ? 'flex-1 sm:flex-initial' : 'w-full sm:w-auto'} rounded-2xl border bg-card p-1 text-xs font-bold shadow-sm`}
          aria-label="Moneda"
        >
          {['DOP', 'USD'].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCurrency(item)}
              className={`min-w-12 flex-1 sm:min-w-14 rounded-xl px-2.5 sm:px-3 transition-colors ${
                currency === item
                  ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'
                  : 'text-muted-foreground'
              }`}
              aria-pressed={currency === item}
            >
              {item}
            </button>
          ))}
        </div>
        {action}
      </div>
    </div>
  );
};
