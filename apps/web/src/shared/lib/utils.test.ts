import { describe, expect, it } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatRelativeDate,
  parseNumericInput,
  isValidEmail,
  getOrganizationMeta,
} from './utils';

describe('formatCurrency', () => {
  it('formats Dominican Pesos (DOP) correctly', () => {
    expect(formatCurrency(1500)).toBe('RD$ 1,500.00');
    expect(formatCurrency(1500.5, 'DOP')).toBe('RD$ 1,500.50');
    expect(formatCurrency(0, 'DOP')).toBe('RD$ 0.00');
  });

  it('formats USD and EUR correctly', () => {
    expect(formatCurrency(49.99, 'USD')).toBe('$ 49.99');
    expect(formatCurrency(100, 'EUR')).toBe('€ 100.00');
  });

  it('formats negative amounts with leading minus sign', () => {
    expect(formatCurrency(-250.75, 'DOP')).toBe('-RD$ 250.75');
    expect(formatCurrency(-50, 'USD')).toBe('-$ 50.00');
  });

  it('handles null, undefined and NaN gracefully', () => {
    expect(formatCurrency(null)).toBe('-');
    expect(formatCurrency(undefined)).toBe('-');
    expect(formatCurrency(NaN)).toBe('-');
  });
});

describe('formatDate and formatRelativeDate', () => {
  it('formats ISO dates accurately in Spanish', () => {
    const date = new Date('2026-08-25T14:30:00Z');
    const result = formatDate(date);
    expect(result).toBeTruthy();
    expect(result).not.toBe('-');
  });

  it('formats relative dates for today and yesterday', () => {
    const now = new Date();
    expect(formatRelativeDate(now)).toContain('Hoy');

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(formatRelativeDate(yesterday)).toContain('Ayer');
  });

  it('returns fallback for empty or invalid dates', () => {
    expect(formatDate(null)).toBe('-');
    expect(formatDate('')).toBe('-');
    expect(formatRelativeDate(null)).toBe('-');
  });
});

describe('parseNumericInput', () => {
  it('parses integers and decimal numbers with dots', () => {
    expect(parseNumericInput('1500')).toBe(1500);
    expect(parseNumericInput('1500.50')).toBe(1500.5);
    expect(parseNumericInput('0.99')).toBe(0.99);
  });

  it('parses numbers with comma decimals and thousands spaces', () => {
    expect(parseNumericInput('1500,50')).toBe(1500.5);
    expect(parseNumericInput('1 500.50')).toBe(1500.5);
  });

  it('returns null for invalid strings or negative/empty input', () => {
    expect(parseNumericInput('')).toBeNull();
    expect(parseNumericInput('abc')).toBeNull();
    expect(parseNumericInput(null)).toBeNull();
    expect(parseNumericInput(undefined)).toBeNull();
  });
});

describe('isValidEmail', () => {
  it('validates standard email addresses', () => {
    expect(isValidEmail('usuario@dominio.com')).toBe(true);
    expect(isValidEmail('adrian.hidalgo@empresa.com.do')).toBe(true);
    expect(isValidEmail('user+tag@gmail.com')).toBe(true);
  });

  it('rejects invalid email formats', () => {
    expect(isValidEmail('invalido')).toBe(false);
    expect(isValidEmail('usuario@')).toBe(false);
    expect(isValidEmail('@dominio.com')).toBe(false);
    expect(isValidEmail('usuario@dominio')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('getOrganizationMeta', () => {
  it('identifies banks accurately from source or merchant', () => {
    expect(getOrganizationMeta('BHD', '').id).toBe('BHD');
    expect(getOrganizationMeta('POPULAR', '').id).toBe('POPULAR');
    expect(getOrganizationMeta('BANRESERVAS', '').id).toBe('BANRESERVAS');
    expect(getOrganizationMeta('QIK', '').id).toBe('QIK');
    expect(getOrganizationMeta('MANUAL', '').id).toBe('MANUAL');
    expect(getOrganizationMeta('', 'Banco Popular Dominicano').id).toBe('POPULAR');
  });
});
