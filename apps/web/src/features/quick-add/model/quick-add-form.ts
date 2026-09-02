import { isFutureLocalDateTime, parseNumericInput } from '@/shared/lib';

export interface QuickAddFormValues {
  amount: string;
  movementType: string;
  merchant: string;
  dateTime: string;
  notes: string;
}

export type QuickAddFieldErrors = Partial<Record<keyof QuickAddFormValues, string>>;

export const transactionTypes: Record<string, string> = {
  compra: 'Compra',
  enviada: 'Transferencia',
  servicio: 'Pago de Servicio',
  retiro: 'Retiro',
};

const defaultCategories: Record<string, string> = {
  compra: 'Supermercado',
  enviada: 'Transferencias',
  servicio: 'Servicios',
  retiro: 'Servicios Financieros',
};

export function defaultCategoryFor(movementType: string): string {
  return defaultCategories[movementType] ?? 'Otros';
}

export function validateQuickAddForm(values: QuickAddFormValues): QuickAddFieldErrors {
  const errors: QuickAddFieldErrors = {};
  const parsedAmount = parseNumericInput(values.amount);
  if (parsedAmount === null || parsedAmount <= 0) {
    errors.amount = 'Ingresa un monto válido mayor a 0';
  } else if (parsedAmount > 100_000_000) {
    errors.amount = 'El monto excede el límite permitido';
  }
  if (!values.merchant.trim()) {
    errors.merchant = 'Ingresa el nombre del comercio o beneficiario';
  } else if (values.merchant.trim().length > 200) {
    errors.merchant = 'El nombre no puede superar 200 caracteres';
  }
  if (values.notes.trim().length > 500) {
    errors.notes = 'Las notas no pueden superar 500 caracteres';
  }
  const parsedDate = new Date(values.dateTime);
  if (Number.isNaN(parsedDate.getTime())) {
    errors.dateTime = 'Fecha inválida';
  } else if (isFutureLocalDateTime(values.dateTime)) {
    errors.dateTime = 'La fecha y hora no pueden estar en el futuro';
  }
  return errors;
}
