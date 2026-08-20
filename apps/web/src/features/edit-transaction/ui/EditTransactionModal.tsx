import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  Button,
  Input
} from '@/shared/ui';
import type { Transaction } from '@/entities/transaction';
import { formatCurrency, formatDate } from '@/shared/lib';

interface EditTransactionModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, merchant: string, category: string, notes: string) => Promise<void>;
}

const COMMON_CATEGORIES = [
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
  'Hogar',
  'Ropa & Moda',
  'Entretenimiento',
  'Tecnología',
  'Otros',
];

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onSave,
}) => {
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (transaction) {
      setMerchant(transaction.merchant || transaction.rawMerchant || '');
      setCategory(transaction.category || 'Otros');
      setNotes(transaction.notes || '');
    }
  }, [transaction]);

  if (!transaction) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(transaction.id, merchant, category, notes);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Transacción</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-2">
          
          {/* Summary Box */}
          <div className="rounded-xl border bg-muted/40 p-3.5 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monto:</span>
              <span className="font-bold text-foreground text-sm">
                {formatCurrency(transaction.amount, transaction.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fecha:</span>
              <span>{formatDate(transaction.transactionDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Original:</span>
              <span className="font-mono text-muted-foreground truncate max-w-[200px]" title={transaction.rawMerchant}>
                {transaction.rawMerchant}
              </span>
            </div>
          </div>

          {/* Merchant Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Nombre del Comercio / Beneficiario</label>
            <Input
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="Ej: Supermercados Bravo o Billy Noel"
              required
            />
          </div>

          {/* Category Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {COMMON_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold">Notas / Comentarios (Opcional)</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Compra de despensa o pago de cena"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
