import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@/entities/transaction/api/transaction.service';
import { transactionKeys } from '@/entities/transaction/api/query-keys';
import { FINANCIAL_INSTITUTIONS } from '@/shared/config/financial-options';

const transactionTypes: Record<string, string> = {
  recibida: 'Transferencia Recibida', compra: 'Compra', enviada: 'Transferencia',
  servicio: 'Pago de Servicio', retiro: 'Retiro',
};

function currentLocalDateTime() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function useQuickAddTransaction(onSuccess: () => void, onClose: () => void) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('DOP');
  const [movementType, setMovementType] = useState('recibida');
  const [organization, setOrganization] = useState('BHD');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('Ingresos / Transferencias');
  const [dateTime, setDateTime] = useState(currentLocalDateTime());
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState('');

  const mutation = useMutation({
    mutationFn: transactionService.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      await queryClient.invalidateQueries({ queryKey: ['stats'] });
      setAmount(''); setMerchant(''); setNotes('');
      onSuccess(); onClose();
    },
  });

  const handleTypeChange = (type: string) => {
    setMovementType(type);
    if (type === 'recibida') setCategory('Ingresos / Transferencias');
    else if (type === 'servicio') setCategory('Servicios');
    else if (type === 'compra' && category === 'Ingresos / Transferencias') setCategory('Supermercado');
  };

  const submit = async () => {
    if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
      setValidationError('Ingresa un monto válido.'); return;
    }
    if (!merchant.trim()) {
      setValidationError('Ingresa el nombre del comercio o emisor.'); return;
    }
    setValidationError('');
    const institution = FINANCIAL_INSTITUTIONS.find((item) => item.id === organization);
    await mutation.mutateAsync({
      externalId: `manual_${Date.now()}_${crypto.randomUUID().slice(0, 5)}`,
      amount: Number(amount), currency, rawMerchant: merchant.trim(), merchant: merchant.trim(), category,
      status: 'Aprobada', transactionType: transactionTypes[movementType] ?? 'Transferencia Recibida',
      transactionDate: new Date(dateTime).toISOString(), source: institution?.source ?? 'MANUAL',
      institutionCode: institution?.id === 'MANUAL' ? 'CASH' : institution?.id ?? 'CASH',
      ingestionChannel: 'MANUAL', notes: notes.trim() || null,
    });
  };

  return {
    amount, setAmount, currency, setCurrency, movementType, organization, setOrganization,
    merchant, setMerchant, category, setCategory, dateTime, setDateTime, notes, setNotes,
    handleTypeChange, submit, loading: mutation.isPending,
    error: validationError || mutation.error?.message || '',
  };
}
