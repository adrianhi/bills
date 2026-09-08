import type {
  BudgetSummaryDto,
  ProactiveActionDto,
  ProactiveActionPriority,
  RecurringBillDto,
  SafeToSpendDto,
  TransactionDto,
} from '@bills/contracts';

export interface ProactiveEvaluationInput {
  currency: 'DOP' | 'USD';
  today: string;
  month: string;
  monthDaysRemaining: number;
  recurringBills: RecurringBillDto[];
  recurringAttention: RecurringBillDto[];
  budgetSummary: BudgetSummaryDto | null;
  safeToSpend: SafeToSpendDto | null;
  unclassifiedTransactions: TransactionDto[];
  dismissedActionIds: Set<string>;
}

function formatMoney(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function evaluateProactiveFeed(input: ProactiveEvaluationInput): {
  actions: ProactiveActionDto[];
  counts: { total: number; imminentBills: number; pacingRisks: number; unclassified: number };
} {
  const actions: ProactiveActionDto[] = [];
  let imminentBillsCount = 0;
  let pacingRisksCount = 0;

  // 1. Imminent Recurring Bills (next 0-3 days)
  for (const bill of input.recurringBills) {
    if (bill.monthStatus !== 'PAID' && bill.daysRemaining >= 0 && bill.daysRemaining <= 3) {
      imminentBillsCount++;
      const id = `imminent-bill-${bill.id}-${input.today}`;
      if (!input.dismissedActionIds.has(id)) {
        const dueText = bill.daysRemaining === 0 ? 'hoy' : bill.daysRemaining === 1 ? 'mañana' : `en ${bill.daysRemaining} días`;
        actions.push({
          id,
          kind: 'IMMINENT_BILL',
          priority: 'HIGH',
          title: `Cobro próximo: ${bill.displayName}`,
          description: `Vence ${dueText} por ${formatMoney(bill.expectedAmount, bill.currency)}. Asegúrate de tener saldo disponible.`,
          ctaLabel: 'Ver en Fijos',
          actionType: 'NAVIGATE_RECURRING',
          dismissible: true,
          metadata: { billId: bill.id, expectedAmount: bill.expectedAmount, daysRemaining: bill.daysRemaining },
        });
      }
    }
  }

  // 2. Budget Pacing Risk
  if (input.budgetSummary) {
    for (const cat of input.budgetSummary.categories) {
      const isRisk = cat.status === 'PACE_WARNING' || cat.status === 'EXCEEDED' ||
        (cat.percentUsed >= 80 && input.monthDaysRemaining >= 7);
      if (isRisk) {
        pacingRisksCount++;
        const id = `pacing-risk-${cat.categoryKey}-${input.month}`;
        if (!input.dismissedActionIds.has(id)) {
          const projectedOver = cat.projected ? Math.max(0, cat.projected - cat.limit) : cat.exceededBy;
          const overText = projectedOver > 0 ? ` A este ritmo te excederás por ~${formatMoney(projectedOver, input.currency)}.` : '';
          actions.push({
            id,
            kind: 'BUDGET_PACING_RISK',
            priority: cat.status === 'EXCEEDED' ? 'HIGH' : 'MEDIUM',
            title: `Riesgo en ${cat.categoryLabel || cat.categoryKey}`,
            description: `Llevas el ${Math.round(cat.percentUsed)}% consumido (${formatMoney(cat.spent, input.currency)} de ${formatMoney(cat.limit, input.currency)}) y faltan ${input.monthDaysRemaining} días.${overText}`,
            ctaLabel: 'Ajustar presupuesto',
            actionType: 'NAVIGATE_BUDGET',
            dismissible: true,
            metadata: { categoryKey: cat.categoryKey, percentUsed: cat.percentUsed, limit: cat.limit, spent: cat.spent },
          });
        }
      }
    }
  }

  // 3. Unclassified Expenses (category 'Otros' or empty)
  const unclassifiedCount = input.unclassifiedTransactions.length;
  if (unclassifiedCount > 0) {
    const id = `unclassified-expenses-${input.today}`;
    if (!input.dismissedActionIds.has(id)) {
      actions.push({
        id,
        kind: 'UNCLASSIFIED_EXPENSES',
        priority: 'MEDIUM',
        title: `${unclassifiedCount} ${unclassifiedCount === 1 ? 'compra por categorizar' : 'compras por categorizar'}`,
        description: `Tienes movimientos recientes registrados como "Otros". Clasifícalos en 1 tap para afinar tus presupuestos.`,
        ctaLabel: 'Clasificar ahora',
        actionType: 'QUICK_CATEGORIZE',
        dismissible: true,
        metadata: {
          count: unclassifiedCount,
          sample: input.unclassifiedTransactions.slice(0, 5).map((t) => ({
            id: t.id,
            merchant: t.merchant,
            amount: t.amount,
            currency: t.currency,
            transactionDate: t.transactionDate,
          })),
        },
      });
    }
  }

  // 4. Price Hike Alerts
  for (const bill of input.recurringAttention) {
    const hikeAlert = bill.alerts.find((a) => a.kind === 'PRICE_HIKE');
    if (hikeAlert) {
      const id = `price-hike-${bill.id}-${hikeAlert.id}`;
      if (!input.dismissedActionIds.has(id)) {
        const obs = hikeAlert.observedAmount ? formatMoney(hikeAlert.observedAmount, bill.currency) : '';
        const base = hikeAlert.baselineAmount ? formatMoney(hikeAlert.baselineAmount, bill.currency) : '';
        actions.push({
          id,
          kind: 'PRICE_HIKE',
          priority: 'MEDIUM',
          title: `Aumento detectado: ${bill.displayName}`,
          description: `El último cobro (${obs}) superó el monto habitual registrado (${base}).`,
          ctaLabel: 'Revisar cobro',
          actionType: 'NAVIGATE_RECURRING',
          dismissible: true,
          metadata: { billId: bill.id, alertId: hikeAlert.id },
        });
      }
    }
  }

  // 5. Positive Streak (only if in surplus and no active pacing risks)
  if (input.safeToSpend?.status === 'SURPLUS' && pacingRisksCount === 0 && input.safeToSpend.todayAvailable > 0) {
    const id = `saving-streak-${input.today}`;
    if (!input.dismissedActionIds.has(id)) {
      actions.push({
        id,
        kind: 'SAVING_STREAK',
        priority: 'LOW',
        title: 'Ritmo financiero saludable',
        description: `Vas dentro de tu plan mensual. Cuentas con ${formatMoney(input.safeToSpend.todayAvailable, input.currency)} de margen libre para hoy.`,
        ctaLabel: 'Ver panorama',
        actionType: 'VIEW_OVERVIEW',
        dismissible: true,
        metadata: { todayAvailable: input.safeToSpend.todayAvailable },
      });
    }
  }

  // Sort by priority: HIGH first, then MEDIUM, then LOW
  const priorityOrder: Record<ProactiveActionPriority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return {
    actions,
    counts: {
      total: actions.length,
      imminentBills: imminentBillsCount,
      pacingRisks: pacingRisksCount,
      unclassified: unclassifiedCount,
    },
  };
}
