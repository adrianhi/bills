export function normalizeLabel(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function isIncomeCategory(value: string): boolean {
  return /ingreso|recibida|transfer income/.test(normalizeLabel(value));
}
