export { normalizeLabel as normalizeCategoryKey } from '../../../shared/domain/normalize-label';

export function categoryTargetKey(categoryKey: string): string {
  return `category:${categoryKey}`;
}
