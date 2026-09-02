const roundUp = (value: number, currency: 'DOP' | 'USD') => {
  const step = currency === 'DOP' ? 100 : 5;
  return Math.ceil(value / step) * step;
};

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function suggestedAmount(values: number[], currency: 'DOP' | 'USD'): number | null {
  const value = median(values);
  return value !== null && value > 0 ? roundUp(value, currency) : null;
}
