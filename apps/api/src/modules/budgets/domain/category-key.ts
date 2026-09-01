export function normalizeCategoryKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('es-DO');
}

export function categoryTargetKey(categoryKey: string): string {
  return `category:${categoryKey}`;
}
