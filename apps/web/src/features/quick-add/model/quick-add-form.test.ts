import { describe, expect, it } from 'vitest';
import { currentLocalDateTime } from '@/shared/lib';
import { defaultCategoryFor, transactionTypes, validateQuickAddForm } from './quick-add-form';

const validValues = {
  amount: '1500.50',
  movementType: 'compra',
  merchant: 'Supermercado',
  dateTime: currentLocalDateTime(),
  notes: '',
};

describe('quick add form rules', () => {
  it('accepts a complete movement', () => {
    expect(validateQuickAddForm(validValues)).toEqual({});
  });

  it('rejects invalid and excessive amounts', () => {
    expect(validateQuickAddForm({ ...validValues, amount: '0' }).amount).toContain('mayor a 0');
    expect(validateQuickAddForm({ ...validValues, amount: '100000001' }).amount).toContain('límite');
  });

  it('validates the merchant field for expense movements', () => {
    expect(validateQuickAddForm({ ...validValues, merchant: '', movementType: 'compra' }).merchant).toContain('comercio');
    expect(validateQuickAddForm({ ...validValues, merchant: 'x'.repeat(201) }).merchant).toContain('200');
  });

  it('rejects long notes and invalid or future dates', () => {
    expect(validateQuickAddForm({ ...validValues, notes: 'x'.repeat(501) }).notes).toContain('500');
    expect(validateQuickAddForm({ ...validValues, dateTime: 'not-a-date' }).dateTime).toContain('inválida');
    expect(validateQuickAddForm({ ...validValues, dateTime: '2999-01-01T00:00' }).dateTime).toContain('futuro');
  });

  it('maps movement types and fallback categories', () => {
    expect(transactionTypes.retiro).toBe('Retiro');
    expect(transactionTypes.ingreso).toBe('Transferencia Recibida');
    expect(defaultCategoryFor('servicio')).toBe('Servicios');
    expect(defaultCategoryFor('ingreso')).toBe('Nómina / Salario');
    expect(defaultCategoryFor('unknown')).toBe('Otros');
  });
});
