import { ArrowDownLeft, ArrowUpRight, Check, CreditCard, Landmark, Receipt } from 'lucide-react';
import { COMMON_CATEGORIES, COMMON_INCOME_CATEGORIES, FINANCIAL_INSTITUTIONS } from '@/shared/config/financial-options';
import { formatCurrency, toDateValue } from '@/shared/lib';
import { Button, DateTimePickerField, DialogFooter, Input } from '@/shared/ui';
import type { QuickAddTransactionModel } from '../model/useQuickAddTransaction';

const MOVEMENT_TYPES = [
  { id: 'compra', label: 'Compra', icon: CreditCard },
  { id: 'enviada', label: 'Transf. Enviada', icon: ArrowUpRight },
  { id: 'ingreso', label: 'Ingreso / Depósito', icon: ArrowDownLeft },
  { id: 'servicio', label: 'Servicio', icon: Receipt },
  { id: 'retiro', label: 'Retiro', icon: Landmark },
];

interface QuickAddTransactionFieldsProps {
  model: QuickAddTransactionModel;
  onCancel: () => void;
}

export function QuickAddTransactionFields({ model, onCancel }: QuickAddTransactionFieldsProps) {
  const {
    amount, setAmount, currency, setCurrency, movementType, organization, setOrganization,
    merchant, setMerchant, category, setCategory, dateTime, setDateTime, notes, setNotes,
    loading, error, fieldErrors, handleTypeChange,
  } = model;

  return (
    <>
      {error && <div className="rounded-lg bg-destructive/10 p-2.5 text-xs font-semibold text-destructive">{error}</div>}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">Tipo de Movimiento</label>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {MOVEMENT_TYPES.map(({ id, label, icon: Icon }) => {
            const selected = movementType === id;
            return (
              <button key={id} type="button" onClick={() => handleTypeChange(id)} className={`flex cursor-pointer items-center gap-1.5 rounded-xl border p-2 text-left text-xs font-semibold transition-all ${selected ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 shadow-sm dark:text-emerald-400' : 'border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground'}`}>
                <Icon className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground">Monto</label>
          {amount && !Number.isNaN(Number(amount)) && Number(amount) > 0 && <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(Number(amount), currency)}</span>}
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-bold text-muted-foreground">{currency === 'DOP' ? 'RD$' : '$'}</span>
            <Input type="number" step="0.01" min="0.01" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} className={`h-11 pl-11 text-base font-bold ${fieldErrors.amount ? 'border-destructive focus-visible:ring-destructive' : ''}`} autoFocus />
          </div>
          <div className="flex rounded-xl border bg-muted p-1 text-xs font-semibold">
            {['DOP', 'USD'].map((code) => <button key={code} type="button" onClick={() => setCurrency(code)} className={`rounded-lg px-3 py-1 transition-all ${currency === code ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>{code}</button>)}
          </div>
        </div>
        {fieldErrors.amount && <p className="text-[11px] font-medium text-destructive">{fieldErrors.amount}</p>}
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">Entidad / Banco</label>
        <select value={organization} onChange={(event) => setOrganization(event.target.value)} className="h-10 w-full cursor-pointer rounded-xl border border-input bg-background px-3 text-xs font-semibold text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
          {FINANCIAL_INSTITUTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground">
            {movementType === 'ingreso' ? 'Emisor u Origen del Ingreso' : 'Comercio o Beneficiario'}
          </label>
          <span className="text-[10px] text-muted-foreground">{merchant.length}/200</span>
        </div>
        <Input
          placeholder={movementType === 'ingreso' ? 'Ej: Nómina de empresa / Cliente freelance' : 'Ej: Supermercado Bravo / Netflix'}
          value={merchant}
          maxLength={200}
          onChange={(event) => setMerchant(event.target.value)}
          className={`h-10 text-xs ${fieldErrors.merchant ? 'border-destructive focus-visible:ring-destructive' : ''}`}
        />
        {fieldErrors.merchant && <p className="text-[11px] font-medium text-destructive">{fieldErrors.merchant}</p>}
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground">Categoría</label>
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 w-full cursor-pointer rounded-xl border border-input bg-background px-3 text-xs font-semibold text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
          {(movementType === 'ingreso' ? COMMON_INCOME_CATEGORIES : COMMON_CATEGORIES).map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
      <DateTimePickerField value={dateTime} onChange={setDateTime} label="Fecha y hora" maxDate={toDateValue(new Date())} error={fieldErrors.dateTime} description="Usaremos tu hora local y la guardaremos de forma segura." />
      <div className="space-y-1.5">
        <div className="flex items-center justify-between"><label className="text-xs font-semibold text-muted-foreground">Nota / Comentario (Opcional)</label><span className="text-[10px] text-muted-foreground">{notes.length}/500</span></div>
        <Input placeholder="Ej: Pago de almuerzo pendiente" value={notes} maxLength={500} onChange={(event) => setNotes(event.target.value)} className={`h-9 text-xs ${fieldErrors.notes ? 'border-destructive focus-visible:ring-destructive' : ''}`} />
        {fieldErrors.notes && <p className="text-[11px] font-medium text-destructive">{fieldErrors.notes}</p>}
      </div>
      <DialogFooter className="gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading} className="h-10">Cancelar</Button>
        <Button type="submit" disabled={loading} className="h-10 gap-1.5 font-semibold shadow-md shadow-emerald-500/20">
          <Check className="h-4 w-4" />
          <span>{loading ? 'Guardando...' : movementType === 'ingreso' ? 'Guardar Ingreso' : 'Guardar Movimiento'}</span>
        </Button>
      </DialogFooter>
    </>
  );
}
