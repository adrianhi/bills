import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@/entities/transaction/api/transaction.service';
import { transactionKeys } from '@/entities/transaction/api/query-keys';
import { FINANCIAL_INSTITUTIONS } from '@/shared/config/financial-options';
import { parseNumericInput } from '@/shared/lib';
import { ApiClientError } from '@/shared/api';

const transactionTypes: Record<string, string> = {
  recibida: 'Transferencia Recibida',
  compra: 'Compra',
  enviada: 'Transferencia',
  servicio: 'Pago de Servicio',
  retiro: 'Retiro',
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setGeneralError('');
  };

  const mutation = useMutation({
    mutationFn: transactionService.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      await queryClient.invalidateQueries({ queryKey: ['stats'] });
      setAmount('');
      setMerchant('');
      setNotes('');
      setFieldErrors({});
      setGeneralError('');
      onSuccess();
      onClose();
    },
    onError: (error: unknown) => {
      if (error instanceof ApiClientError && error.details && Array.isArray(error.details)) {
        const mapped: Record<string, string> = {};
        for (const item of error.details) {
          if (item && typeof item === 'object' && 'path' in item && 'message' in item) {
            mapped[String(item.path)] = String(item.message);
          }
        }
        if (Object.keys(mapped).length > 0) {
          setFieldErrors(mapped);
          return;
        }
      }
      setGeneralError(error instanceof Error ? error.message : 'Error al guardar la transacción');
    },
  });

  const handleTypeChange = (type: string) => {
    setMovementType(type);
    if (type === 'recibida') setCategory('Ingresos / Transferencias');
    else if (type === 'servicio') setCategory('Servicios');
    else if (type === 'compra' && category === 'Ingresos / Transferencias') setCategory('Supermercado');
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    const parsedAmount = parseNumericInput(amount);

    if (parsedAmount === null || parsedAmount <= 0) {
      errors.amount = 'Ingresa un monto válido mayor a 0';
    } else if (parsedAmount > 100_000_000) {
      errors.amount = 'El monto excede el límite permitido';
    }

    if (!merchant.trim()) {
      errors.merchant = movementType === 'recibida'
        ? 'Ingresa el nombre de quien te transfirió'
        : 'Ingresa el nombre del comercio o beneficiario';
    } else if (merchant.trim().length > 100) {
      errors.merchant = 'El nombre no puede superar 100 caracteres';
    }

    if (notes.trim().length > 250) {
      errors.notes = 'Las notas no pueden superar 250 caracteres';
    }

    const parsedDate = new Date(dateTime);
    if (isNaN(parsedDate.getTime())) {
      errors.dateTime = 'Fecha inválida';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setGeneralError('');
    const parsedAmount = parseNumericInput(amount)!;
    const institution = FINANCIAL_INSTITUTIONS.find((item) => item.id === organization);

    await mutation.mutateAsync({
      externalId: `manual_${Date.now()}_${crypto.randomUUID().slice(0, 5)}`,
      amount: parsedAmount,
      currency,
      rawMerchant: merchant.trim(),
      merchant: merchant.trim(),
      category,
      status: 'Aprobada',
      transactionType: transactionTypes[movementType] ?? 'Transferencia Recibida',
      transactionDate: new Date(dateTime).toISOString(),
      source: institution?.source ?? 'MANUAL',
      institutionCode: institution?.id === 'MANUAL' ? 'CASH' : institution?.id ?? 'CASH',
      ingestionChannel: 'MANUAL',
      notes: notes.trim() || null,
    });
  };

  return {
    amount,
    setAmount: (val: string) => {
      setAmount(val);
      clearFieldError('amount');
    },
    currency,
    setCurrency,
    movementType,
    organization,
    setOrganization,
    merchant,
    setMerchant: (val: string) => {
      setMerchant(val);
      clearFieldError('merchant');
    },
    category,
    setCategory,
    dateTime,
    setDateTime: (val: string) => {
      setDateTime(val);
      clearFieldError('dateTime');
    },
    notes,
    setNotes: (val: string) => {
      setNotes(val);
      clearFieldError('notes');
    },
    fieldErrors,
    handleTypeChange,
    submit,
    loading: mutation.isPending,
    error: generalError || (Object.keys(fieldErrors).length > 0 ? 'Por favor corrige los campos marcados' : ''),
  };
}
