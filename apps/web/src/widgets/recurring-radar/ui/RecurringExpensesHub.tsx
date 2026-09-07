import type { RecurringBillDto, RecurringRadarDto } from '@/entities/recurring-bill';
import { Card, CardContent } from '@/shared/ui';
import { RecurringBurdenKpiCard } from './RecurringBurdenKpiCard';
import { RecurringSuggestionsCard } from './RecurringSuggestionsCard';
import { RecurringTimelineList } from './RecurringTimelineList';

interface RecurringExpensesHubProps {
  radar: RecurringRadarDto | null;
  loading: boolean;
  currency: string;
  hideBalances: boolean;
  onOpenAddModal: () => void;
  onOpenIncomeModal: () => void;
  onEdit: (bill: RecurringBillDto) => void;
  onStatus: (bill: RecurringBillDto, status: 'CONFIRMED' | 'PAUSED' | 'DISMISSED') => void;
  onAcknowledgeAlert: (alertId: string) => void;
}

export function RecurringExpensesHub({
  radar,
  loading,
  currency,
  hideBalances,
  onOpenAddModal,
  onOpenIncomeModal,
  onEdit,
  onStatus,
  onAcknowledgeAlert,
}: RecurringExpensesHubProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-48 animate-pulse rounded-2xl bg-muted" />
        <div className="h-64 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (!radar) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          No pudimos consultar tus gastos recurrentes. Intenta recargar la página.
        </CardContent>
      </Card>
    );
  }

  const allConfirmedAndPaused = [...(radar.allConfirmed || radar.upcoming), ...(radar.paused || [])]
    .filter((bill, index, array) => array.findIndex((b) => b.id === bill.id) === index);

  return (
    <div className="space-y-5">
      {/* KPI Card */}
      <RecurringBurdenKpiCard
        radar={radar}
        hideBalances={hideBalances}
        currency={currency}
        onOpenAddModal={onOpenAddModal}
        onOpenIncomeModal={onOpenIncomeModal}
      />

      {/* Auto-detected Suggestions */}
      <RecurringSuggestionsCard
        suggestions={radar.suggestions || []}
        hideBalances={hideBalances}
        onConfirm={(bill) => onStatus(bill, 'CONFIRMED')}
        onDismiss={(bill) => onStatus(bill, 'DISMISSED')}
      />

      {/* Timeline List of Recurring Bills */}
      <RecurringTimelineList
        bills={allConfirmedAndPaused}
        hideBalances={hideBalances}
        onEdit={onEdit}
        onStatus={onStatus}
        onAcknowledgeAlert={onAcknowledgeAlert}
      />
    </div>
  );
}
