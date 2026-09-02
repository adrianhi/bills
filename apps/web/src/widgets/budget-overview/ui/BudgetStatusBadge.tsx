import type { BudgetProgressDto } from '@/entities/budget';
import { Badge } from '@/shared/ui';

const labels: Record<BudgetProgressDto['status'], string> = {
  ON_TRACK: 'En ritmo', PACE_WARNING: 'Ritmo acelerado', NEAR_LIMIT: 'Cerca del límite', EXCEEDED: 'Excedido',
};
const styles: Record<BudgetProgressDto['status'], string> = {
  ON_TRACK: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  PACE_WARNING: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  NEAR_LIMIT: 'border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300',
  EXCEEDED: 'border-destructive/20 bg-destructive/10 text-destructive',
};

export function BudgetStatusBadge({ status }: { status: BudgetProgressDto['status'] }) {
  return (
    <Badge
      variant="outline"
      className={`inline-flex shrink-0 items-center whitespace-nowrap px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </Badge>
  );
}
