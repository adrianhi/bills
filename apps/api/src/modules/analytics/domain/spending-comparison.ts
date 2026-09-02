export interface SpendingDelta {
  name: string;
  currentTotal: number;
  previousTotal: number;
  changeAmount: number;
  changePercent: number | null;
}

export const roundAmount = (value: number) => Math.round(value * 100) / 100;
export const changePercent = (value: number, previous: number) =>
  previous > 0 ? Math.round((value - previous) / previous * 1000) / 10 : null;

export function spendingDeltas<T extends { total: number }>(
  current: readonly T[], previous: readonly T[], nameOf: (item: T) => string,
): SpendingDelta[] {
  const currentMap = new Map(current.map((item) => [nameOf(item), item.total]));
  const previousMap = new Map(previous.map((item) => [nameOf(item), item.total]));
  return [...new Set([...currentMap.keys(), ...previousMap.keys()])]
    .map((name) => {
      const currentTotal = currentMap.get(name) ?? 0;
      const previousTotal = previousMap.get(name) ?? 0;
      return { name, currentTotal, previousTotal, changeAmount: roundAmount(currentTotal - previousTotal), changePercent: changePercent(currentTotal, previousTotal) };
    })
    .filter((item) => item.currentTotal > 0 || item.previousTotal > 0)
    .sort((a, b) => Math.abs(b.changeAmount) - Math.abs(a.changeAmount) || a.name.localeCompare(b.name));
}

export function selectChangeDriver(deltas: readonly SpendingDelta[], netChange: number) {
  const increases = deltas.filter((item) => item.changeAmount > 0).sort((a, b) => b.changeAmount - a.changeAmount);
  const reductions = deltas.filter((item) => item.changeAmount < 0).sort((a, b) => a.changeAmount - b.changeAmount);
  if (netChange > 0) return increases[0];
  if (netChange < 0) return reductions[0];
  return undefined;
}
