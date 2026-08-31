const TIME_ZONE = 'America/Santo_Domingo';

export function gmailInitialCutoff(now: Date, months: number): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const startMonth = month - Math.max(months, 1) + 1;
  return new Date(Date.UTC(year, startMonth - 1, 1, 4, 0, 0));
}
