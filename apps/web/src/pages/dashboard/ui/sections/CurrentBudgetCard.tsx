import { useState } from 'react';
import { currentBudgetMonth, useBudgetSummary } from '@/entities/budget';
import { BudgetManagerDialog } from '@/features/budget-manager';
import { BudgetOverviewCard } from '@/widgets/budget-overview';

export function CurrentBudgetCard(props: { currency: string; hideBalances: boolean }) {
  const [open, setOpen] = useState(false);
  const month = currentBudgetMonth();
  const currency = props.currency === 'USD' ? 'USD' : 'DOP';
  const query = useBudgetSummary(month, currency);
  return (
    <>
      <BudgetOverviewCard
        summary={query.data || null}
        loading={query.isLoading}
        hideBalances={props.hideBalances}
        onManage={() => setOpen(true)}
        compact={true}
      />
      <BudgetManagerDialog
        open={open}
        onOpenChange={setOpen}
        month={month}
        currency={currency}
        summary={query.data || null}
      />
    </>
  );
}
