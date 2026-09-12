import type {
  BudgetSummaryDto,
  SafeToSpendDto,
  SimulateExpenseCategoryImpactDto,
  SimulateExpenseResultDto,
} from '@bills/contracts';

export interface SimulateExpenseDomainInput {
  amount: number;
  categoryKey?: string;
  currency: 'DOP' | 'USD';
  safeToSpend: SafeToSpendDto | null;
  budgetSummary: BudgetSummaryDto | null;
}

function formatMoney(amount: number, currency: string): string {
  const formatted = Math.abs(amount).toLocaleString('es-DO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${currency} ${formatted}`;
}

export function simulateExpenseImpact(input: SimulateExpenseDomainInput): SimulateExpenseResultDto {
  const amount = Math.round(input.amount * 100) / 100;
  const currency = input.currency;
  const safe = input.safeToSpend;
  const daysRemaining = safe?.daysRemaining ?? 15;

  let currentDaily = safe?.dailyAllowance ?? 0;
  let projectedDaily = currentDaily;
  let allowanceDiff = 0;
  let isGlobalOverspent = false;

  if (safe && safe.globalLimit !== null && safe.globalLimit > 0) {
    const totalSpent = safe.spentBeforeToday + safe.spentToday;
    const projectedTotal = totalSpent + amount;
    const commitments = safe.futureConfirmedCommitments;
    const remaining = Math.max(0, safe.globalLimit - projectedTotal - commitments);

    isGlobalOverspent = projectedTotal > safe.globalLimit;
    currentDaily = safe.dailyAllowance;
    projectedDaily = daysRemaining > 1
      ? Math.round((remaining / (daysRemaining - 1)) * 100) / 100
      : Math.round(remaining * 100) / 100;
    allowanceDiff = Math.round((projectedDaily - currentDaily) * 100) / 100;
  }

  // Evaluate category impact if specified
  let categoryImpact: SimulateExpenseCategoryImpactDto | null = null;
  if (input.categoryKey && input.budgetSummary?.categories) {
    const targetKey = input.categoryKey.toLowerCase();
    const cat = input.budgetSummary.categories.find(
      (c) => Boolean(c.categoryKey && c.categoryKey.toLowerCase() === targetKey)
    );
    if (cat) {
      const projSpent = Math.round((cat.spent + amount) * 100) / 100;
      const projPercent = cat.limit > 0 ? Math.round((projSpent / cat.limit) * 100) : 100;
      const status: SimulateExpenseCategoryImpactDto['status'] =
        projPercent >= 100 ? 'EXCEEDED' : projPercent >= 80 ? 'PACE_WARNING' : 'HEALTHY';
      const catKey = cat.categoryKey || input.categoryKey;
      const catLabel = cat.categoryLabel || catKey;

      categoryImpact = {
        categoryKey: catKey,
        categoryLabel: catLabel,
        currentSpent: cat.spent,
        projectedSpent: projSpent,
        limit: cat.limit,
        currentPercent: Math.round(cat.percentUsed),
        projectedPercent: projPercent,
        status,
      };
    }
  }

  // Determine verdict & advice
  let verdict: SimulateExpenseResultDto['verdict'] = 'SAFE';
  let adviceTitle = 'Compra dentro de tu plan';
  let adviceDescription = '';

  const isCatExceeded = categoryImpact?.status === 'EXCEEDED';
  const isCatWarning = categoryImpact?.status === 'PACE_WARNING';

  if (isGlobalOverspent || isCatExceeded) {
    verdict = 'OVERSPEND';
    adviceTitle = 'Riesgo de sobregiro';
    if (isCatExceeded && categoryImpact) {
      const excess = Math.round((categoryImpact.projectedSpent - categoryImpact.limit) * 100) / 100;
      adviceDescription = `Este gasto superará el límite de ${categoryImpact.categoryLabel} por ${formatMoney(excess, currency)} (llegará al ${categoryImpact.projectedPercent}%).`;
    } else {
      adviceDescription = `Este gasto superará tu presupuesto mensual total para este período.`;
    }
  } else if (
    isCatWarning ||
    (currentDaily > 0 && projectedDaily < currentDaily * 0.7) ||
    (safe?.status === 'ADJUSTING')
  ) {
    verdict = 'TIGHT';
    adviceTitle = 'Atención: margen ajustado';
    if (categoryImpact && isCatWarning) {
      adviceDescription = `${categoryImpact.categoryLabel} subirá al ${categoryImpact.projectedPercent}% de su límite. Tu margen diario bajará a ${formatMoney(projectedDaily, currency)}/día.`;
    } else {
      const dropPct = currentDaily > 0 ? Math.round(((currentDaily - projectedDaily) / currentDaily) * 100) : 0;
      adviceDescription = `Tu dinero libre diario se reducirá un ${dropPct}% (de ${formatMoney(currentDaily, currency)} a ${formatMoney(projectedDaily, currency)}/día para los ${daysRemaining} días restantes).`;
    }
  } else {
    verdict = 'SAFE';
    adviceTitle = 'Compra dentro de tu plan';
    if (categoryImpact) {
      adviceDescription = `Tu margen diario se mantiene en ${formatMoney(projectedDaily, currency)}/día y ${categoryImpact.categoryLabel} quedará en ${categoryImpact.projectedPercent}%.`;
    } else {
      adviceDescription = `Tienes suficiente holgura en tu plan. Tu margen diario continuará en ${formatMoney(projectedDaily, currency)}/día.`;
    }
  }

  return {
    currency,
    simulatedAmount: amount,
    verdict,
    currentDailyAllowance: Math.round(currentDaily * 100) / 100,
    projectedDailyAllowance: Math.round(projectedDaily * 100) / 100,
    allowanceDifference: allowanceDiff,
    daysRemaining,
    categoryImpact,
    adviceTitle,
    adviceDescription,
  };
}
