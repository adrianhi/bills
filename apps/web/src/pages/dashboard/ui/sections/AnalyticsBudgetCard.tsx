import { useState } from 'react';
import type { PeriodSelection } from '@/entities/period';
import { useBudgetSummary } from '@/entities/budget';
import { BudgetManagerDialog } from '@/features/budget-manager';
import { BudgetProgressList } from '@/widgets/budget-overview';
import { Button, Card, CardContent } from '@/shared/ui';

export function AnalyticsBudgetCard(props: { period: PeriodSelection; currency: string; hideBalances: boolean }) {
  const [open, setOpen] = useState(false); const month = props.period.startDate ? null : props.period.month;
  const currency = props.currency === 'USD' ? 'USD' : 'DOP';
  const query = useBudgetSummary(month || '2000-01', currency, Boolean(month));
  if (!month) return <Card><CardContent className="p-5"><p className="font-bold">Planificado vs. real</p><p className="mt-1 text-sm text-muted-foreground">Selecciona un mes calendario para comparar tu presupuesto.</p></CardContent></Card>;
  const summary = query.data || null;
  return <><Card data-product-tour="budget-analytics"><CardContent className="p-5"><div className="mb-4 flex items-center justify-between gap-3"><div><p className="font-bold">Planificado vs. real</p><p className="text-xs text-muted-foreground">Progreso de tus categorías presupuestadas.</p></div><Button size="sm" variant="outline" onClick={() => setOpen(true)}>Gestionar</Button></div>{summary?.hasBudget ? <BudgetProgressList items={summary.categories} currency={currency} hideBalances={props.hideBalances} /> : <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No hay presupuesto configurado para {month}.</p>}</CardContent></Card><BudgetManagerDialog open={open} onOpenChange={setOpen} month={month} currency={currency} summary={summary} /></>;
}
