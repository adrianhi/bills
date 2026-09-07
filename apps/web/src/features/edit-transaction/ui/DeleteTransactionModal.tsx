import React, { useState } from 'react';
import type { Transaction } from '@/entities/transaction';
import { formatCurrency, formatDate } from '@/shared/lib';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui';

interface DeleteTransactionModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
}

export const DeleteTransactionModal: React.FC<DeleteTransactionModalProps> = ({
  transaction,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!transaction) return null;

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      await onConfirm(transaction.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar');
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>¿Eliminar movimiento?</DialogTitle>
          <DialogDescription>
            El movimiento será ocultado de tus listas, presupuestos y reportes.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-2.5 text-xs font-semibold text-destructive">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-border/70 bg-muted/40 p-3 text-xs space-y-1">
          <div className="flex justify-between font-bold text-foreground">
            <span>{transaction.merchant}</span>
            <span>{formatCurrency(transaction.amount, transaction.currency)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{transaction.category || 'Otros'}</span>
            <span>{formatDate(transaction.transactionDate)}</span>
          </div>
        </div>

        <DialogFooter className="grid grid-cols-2 sm:flex sm:justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={handleConfirm} disabled={loading} className="w-full sm:w-auto">
            {loading ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
