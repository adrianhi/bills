export const formatPeriodDay = (value: string): string =>
  new Intl.DateTimeFormat('es-DO', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
