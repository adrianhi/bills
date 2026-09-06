import { useState } from 'react';
import type { RecurringBillDto, UpdateRecurringBillInput } from '@/entities/recurring-bill';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input } from '@/shared/ui';

export function RecurringEditorDialog(props: {
  bill: RecurringBillDto | null;
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: UpdateRecurringBillInput) => Promise<void>;
}) {
  const [name, setName] = useState(props.bill?.displayName || '');
  const [amount, setAmount] = useState(String(props.bill?.expectedAmount || ''));
  const [date, setDate] = useState(props.bill?.nextExpectedDate || '');
  const [cadence, setCadence] = useState<RecurringBillDto['cadence']>(props.bill?.cadence || 'MONTHLY');
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar cobro recurrente</DialogTitle>
          <DialogDescription>Corrige la predicción para que tus reservas sean confiables.</DialogDescription>
        </DialogHeader>
        <label className="grid gap-1 text-sm font-medium">Nombre<Input value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label className="grid gap-1 text-sm font-medium">Importe esperado<Input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
        <label className="grid gap-1 text-sm font-medium">Próxima fecha<Input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label className="grid gap-1 text-sm font-medium">Frecuencia
          <select className="h-9 rounded-md border bg-background px-3 text-sm" value={cadence} onChange={(event) => setCadence(event.target.value as RecurringBillDto['cadence'])}>
            <option value="BIWEEKLY">Quincenal</option><option value="MONTHLY">Mensual</option><option value="ANNUAL">Anual</option>
          </select>
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>Cancelar</Button>
          <Button disabled={props.saving || !name.trim() || Number(amount) <= 0 || !date} onClick={() => void props.onSave({
            displayName: name.trim(), expectedAmount: Number(amount), nextExpectedDate: date, cadence,
          })}>{props.saving ? 'Guardando…' : 'Guardar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
