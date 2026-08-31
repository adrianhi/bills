import React from 'react';
import { PeriodFilter } from '@/features/period-filter';

interface PeriodToolbarProps {
  currentPeriod: React.ComponentProps<typeof PeriodFilter>['currentSelection'];
  onApplyPeriod: React.ComponentProps<typeof PeriodFilter>['onApply'];
  currency: string;
  setCurrency: (currency: string) => void;
}

export const PeriodToolbar: React.FC<PeriodToolbarProps> = ({
  currentPeriod,
  onApplyPeriod,
  currency,
  setCurrency,
}) => {
  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
      <PeriodFilter currentSelection={currentPeriod} onApply={onApplyPeriod} />
      <div
        className="flex min-h-12 w-full rounded-2xl border bg-card p-1 text-xs font-bold shadow-sm sm:w-auto"
        aria-label="Moneda"
      >
        {['DOP', 'USD'].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCurrency(item)}
            className={`min-w-14 flex-1 rounded-xl px-3 transition-colors ${
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
    </div>
  );
};
