import type { FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui';
import { useQuickAddTransaction } from '../model/useQuickAddTransaction';
import { QuickAddTransactionFields } from './QuickAddTransactionFields';

interface QuickAddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  authToken: string | null;
}

export function QuickAddTransactionModal({
  isOpen,
  onClose,
  onSuccess,
}: QuickAddTransactionModalProps) {
  const model = useQuickAddTransaction(onSuccess, onClose);
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await model.submit();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] overflow-hidden rounded-2xl border-border bg-card p-0 shadow-2xl sm:max-w-md">
        <DialogHeader className="border-b border-border/60 p-4 pb-3 sm:p-5">
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
        <form onSubmit={handleSubmit} className="max-h-[75vh] space-y-4 overflow-y-auto p-4 sm:p-5">
          <QuickAddTransactionFields model={model} onCancel={onClose} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
