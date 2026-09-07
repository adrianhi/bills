import { useState } from 'react';
import type { CreateRecurringBillInput } from '@bills/contracts';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input } from '@/shared/ui';

export function RecurringCreatorDialog(props: {
  open: boolean;
  currency: string;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: CreateRecurringBillInput) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const todayStr = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(todayStr);
  const [cadence, setCadence] = useState<'BIWEEKLY' | 'MONTHLY' | 'ANNUAL'>('MONTHLY');

  const reset = () => {
    setName('');
    setAmount('');
    setDate(todayStr);
    setCadence('MONTHLY');
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) reset();
    props.onOpenChange(isOpen);
  };

  const handleSubmit = async () => {
    if (!name.trim() || Number(amount) <= 0 || !date) return;
    await props.onSave({
      displayName: name.trim(),
      expectedAmount: Number(amount),
      currency: (props.currency === 'USD' ? 'USD' : 'DOP'),
      cadence,
      nextExpectedDate: date,
    });
    reset();
  };

  return (
    <Dialog open={props.open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar gasto fijo o suscripción</DialogTitle>
          <DialogDescription>
            Agrega cobros periódicos obligatorios (alquiler, internet, luz, gimnasio, streaming) para saber cuánto de tu sueldo está comprometido.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <label className="grid gap-1.5 text-sm font-medium">
            Nombre del servicio u obligación
            <Input
              placeholder="Ej. Alquiler, Claro Internet, Smart Fit, Edeeste"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5 text-sm font-medium">
              Monto estimado ({props.currency})
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Frecuencia
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                value={cadence}
                onChange={(e) => setCadence(e.target.value as 'BIWEEKLY' | 'MONTHLY' | 'ANNUAL')}
              >
                <option value="MONTHLY">Mensual</option>
                <option value="BIWEEKLY">Quincenal</option>
                <option value="ANNUAL">Anual</option>
              </select>
            </label>
          </div>
          <label className="grid gap-1.5 text-sm font-medium">
            Próxima fecha de pago
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancelar
          </Button>
          <Button
            disabled={props.saving || !name.trim() || Number(amount) <= 0 || !date}
            onClick={() => void handleSubmit()}
          >
            {props.saving ? 'Guardando…' : 'Crear gasto fijo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
