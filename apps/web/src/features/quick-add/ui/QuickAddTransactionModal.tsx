import React, { useState } from 'react';
import { 
  Plus, 
  ArrowDownLeft, 
  ArrowUpRight, 
  CreditCard, 
  Receipt, 
  Landmark,
  Check
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  Button, 
  Input 
} from '@/shared/ui';

interface QuickAddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  authToken: string | null;
}

const ORGANIZATIONS_LIST = [
  { id: 'BHD', label: '🟢 Banco BHD', source: 'BHD_MANUAL' },
  { id: 'POPULAR', label: '🔵 Banco Popular', source: 'POPULAR_MANUAL' },
  { id: 'BANRESERVAS', label: '🔷 Banreservas', source: 'BANRESERVAS_MANUAL' },
  { id: 'QIK', label: '🟣 Qik Banco Digital', source: 'QIK_MANUAL' },
  { id: 'APAP', label: '🟠 APAP', source: 'APAP_MANUAL' },
  { id: 'SCOTIABANK', label: '🔴 Scotiabank', source: 'SCOTIABANK_MANUAL' },
  { id: 'MANUAL', label: '⚪ Manual / Efectivo', source: 'MANUAL' },
];

const MOVEMENT_TYPES = [
  { id: 'recibida', label: '📥 Ingreso / Recibida', type: 'Transferencia Recibida', icon: ArrowDownLeft, color: 'text-emerald-500 bg-emerald-500/10' },
  { id: 'compra', label: '💳 Compra', type: 'Compra', icon: CreditCard, color: 'text-slate-400 bg-muted' },
  { id: 'enviada', label: '↗️ Transf. Enviada', type: 'Transferencia', icon: ArrowUpRight, color: 'text-sky-500 bg-sky-500/10' },
  { id: 'servicio', label: '🧾 Servicio', type: 'Pago de Servicio', icon: Receipt, color: 'text-amber-500 bg-amber-500/10' },
  { id: 'retiro', label: '🏧 Retiro', type: 'Retiro', icon: Landmark, color: 'text-blue-500 bg-blue-500/10' },
];

const CATEGORIES = [
  'Ingresos / Transferencias',
  'Supermercado',
  'Restaurantes & Delivery',
  'Servicios Financieros',
  'Transferencias',
  'Transporte',
  'Combustible',
  'Servicios',
  'Suscripciones',
  'Salud & Farmacia',
  'Compras Online',
  'Otros',
];

const getTodayInputStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export const QuickAddTransactionModal: React.FC<QuickAddTransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  authToken,
}) => {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('DOP');
  const [movementType, setMovementType] = useState('recibida');
  const [organization, setOrganization] = useState('BHD');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('Ingresos / Transferencias');
  const [dateTime, setDateTime] = useState(getTodayInputStr());
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTypeChange = (typeId: string) => {
    setMovementType(typeId);
    if (typeId === 'recibida') {
      setCategory('Ingresos / Transferencias');
    } else if (typeId === 'servicio') {
      setCategory('Servicios');
    } else if (typeId === 'compra' && category === 'Ingresos / Transferencias') {
      setCategory('Supermercado');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Ingresa un monto válido.');
      return;
    }
    if (!merchant.trim()) {
      setError('Ingresa el nombre del comercio o emisor.');
      return;
    }

    setLoading(true);
    setError('');

    const selectedOrg = ORGANIZATIONS_LIST.find((o) => o.id === organization);
    const selectedType = MOVEMENT_TYPES.find((m) => m.id === movementType);

    const payload = {
      externalId: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      amount: Number(amount),
      currency,
      rawMerchant: merchant.trim(),
      merchant: merchant.trim(),
      category,
      status: 'Aprobada',
      transactionType: selectedType?.type || 'Transferencia Recibida',
      transactionDate: new Date(dateTime).toISOString(),
      source: selectedOrg?.source || 'MANUAL',
      institutionCode: selectedOrg?.id === 'MANUAL' ? 'CASH' : selectedOrg?.id || 'CASH',
      ingestionChannel: 'MANUAL',
      notes: notes.trim() || null,
    };

    try {
      const res = await fetch('/api/v1/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        // Reset form
        setAmount('');
        setMerchant('');
        setNotes('');
        onSuccess();
        onClose();
      } else {
        const data = await res.json();
        setError(data.message || 'Error al registrar el movimiento.');
      }
    } catch {
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md w-[95vw] p-0 overflow-hidden rounded-2xl bg-card border-border shadow-2xl">
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Plus className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">Registrar Movimiento Manual</DialogTitle>
              <p className="text-xs text-muted-foreground">Añade transferencias o gastos que no enviaron correo</p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs font-semibold">
              {error}
            </div>
          )}

          {/* 1. Tipo de Movimiento (Quick touch selector) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Tipo de Movimiento</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {MOVEMENT_TYPES.map((t) => {
                const isSelected = movementType === t.id;
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTypeChange(t.id)}
                    className={`flex items-center gap-1.5 p-2 rounded-xl border text-xs font-semibold transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'border-border/60 bg-muted/30 hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{t.label.replace(/^[^\s]+\s/, '')}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Monto & Moneda (Large Mobile Input) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Monto</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2.5 text-sm font-bold text-muted-foreground">
                  {currency === 'DOP' ? 'RD$' : '$'}
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-11 h-11 text-base font-bold"
                  required
                  autoFocus
                />
              </div>

              {/* Currency Toggle */}
              <div className="flex rounded-xl border bg-muted p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setCurrency('DOP')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    currency === 'DOP' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  DOP
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency('USD')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    currency === 'USD' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  USD
                </button>
              </div>
            </div>
          </div>

          {/* 3. Entidad / Banco */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Entidad / Banco</label>
            <select
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-input bg-background text-foreground text-xs font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
            >
              {ORGANIZATIONS_LIST.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.label}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Emisor o Comercio */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              {movementType === 'recibida' ? '¿Quién te transfirió? (Emisor)' : 'Comercio o Beneficiario'}
            </label>
            <Input
              placeholder={movementType === 'recibida' ? 'Ej: Juan Pérez / Carlos Méndez' : 'Ej: Supermercado Bravo / Netflix'}
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="h-10 text-xs"
              required
            />
          </div>

          {/* 5. Categoría */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-input bg-background text-foreground text-xs font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* 6. Fecha y Hora */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Fecha y Hora</label>
            <input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-input bg-background text-foreground text-xs font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
            />
          </div>

          {/* 7. Nota Opcional */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Nota / Comentario (Opcional)</label>
            <Input
              placeholder="Ej: Pago de almuerzo pendiente"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="h-10"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-10 font-semibold gap-1.5 shadow-md shadow-emerald-500/20"
            >
              <Check className="h-4 w-4" />
              <span>{loading ? 'Guardando...' : 'Guardar Movimiento'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
