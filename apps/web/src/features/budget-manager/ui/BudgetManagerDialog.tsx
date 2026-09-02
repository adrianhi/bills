import { Lightbulb, Loader2, Target } from 'lucide-react';
import type { BudgetSummaryDto } from '@/entities/budget';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input } from '@/shared/ui';
import { formatAmountInput, formatCurrency, formatMonthLabel, parseAmountInput } from '@/shared/lib';
import { useBudgetManager } from '../model/useBudgetManager';
import { BudgetLimitRows } from './BudgetLimitRows';

export function BudgetManagerDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string;
  currency: 'DOP' | 'USD';
  summary: BudgetSummaryDto | null;
}) {
  const model = useBudgetManager({ ...props, onSaved: () => props.onOpenChange(false) });
  const monthTitle = formatMonthLabel(props.month);
  const parsedGlobal = parseAmountInput(model.globalLimit);

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Presupuesto de {monthTitle}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <label htmlFor="global-budget" className="text-sm font-bold">
                Límite mensual global ({props.currency})
              </label>
              {parsedGlobal && Number(parsedGlobal) > 0 && (
                <span className="text-xs font-bold text-primary">
                  {formatCurrency(Number(parsedGlobal), props.currency)}
                </span>
              )}
            </div>
            <p className="mb-2 text-xs text-muted-foreground">
              Incluye todos tus gastos visibles y aprobados.
            </p>
            <Input
              id="global-budget"
              type="text"
              inputMode="decimal"
              value={model.globalLimit}
              onChange={(event) => model.setGlobalLimit(formatAmountInput(event.target.value))}
              placeholder="Ej. 50,000"
              className="h-11 font-mono text-base font-bold"
            />
          </div>

          <BudgetLimitRows
            categories={model.categories}
            limits={model.limits}
            setLimit={model.setLimit}
            removeLimit={model.removeLimit}
          />

          {model.globalValue > 0 && model.categoryTotal > model.globalValue && (
            <p className="rounded-xl bg-amber-500/10 p-3 text-xs font-medium text-amber-700 dark:text-amber-300">
              La suma de categorías supera el límite global. Puedes guardarlo así si es intencional.
            </p>
          )}

          <div className="space-y-2">
            <p className="text-sm font-bold">Aplicar cambios</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={model.propagation === 'CURRENT_MONTH' ? 'default' : 'outline'}
                onClick={() => model.setPropagation('CURRENT_MONTH')}
                className="rounded-xl"
              >
                Solo este mes
              </Button>
              <Button
                type="button"
                variant={model.propagation === 'CURRENT_AND_FUTURE' ? 'default' : 'outline'}
                disabled={model.pastMonth}
                onClick={() => model.setPropagation('CURRENT_AND_FUTURE')}
                className="rounded-xl"
              >
                Este y próximos
              </Button>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={model.suggest}
            disabled={model.suggesting}
            className="w-full gap-2 rounded-xl"
          >
            {model.suggesting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Lightbulb className="h-4 w-4 text-amber-500" />
            )}
            Sugerir con mi histórico
          </Button>

          {model.suggestionNote && (
            <p className="text-xs text-muted-foreground">{model.suggestionNote}</p>
          )}

          {model.error && (
            <p className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">{model.error}</p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => props.onOpenChange(false)}
              disabled={model.saving}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => void model.save()}
              disabled={model.saving}
              className="rounded-xl"
            >
              {model.saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar presupuesto
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
