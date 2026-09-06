const DAY_MS = 86_400_000;

export interface PaydayCycle {
  key: string;
  start: string;
  end: string;
  today: string;
  daysRemaining: number;
}

const dateOnly = (date: Date) => date.toISOString().slice(0, 10);
const atUtc = (year: number, month: number, day: number) => new Date(Date.UTC(year, month - 1, day));
const secondPayday = (year: number, month: number) => Math.min(30, new Date(Date.UTC(year, month, 0)).getUTCDate());

export function santoDomingoDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santo_Domingo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

export function currentPaydayCycle(today = santoDomingoDate()): PaydayCycle {
  const [year, month, day] = today.split('-').map(Number);
  const second = secondPayday(year, month);
  let start: Date;
  let end: Date;
  if (day >= second) {
    start = atUtc(year, month, second);
    end = atUtc(month === 12 ? year + 1 : year, month === 12 ? 1 : month + 1, 14);
  } else if (day >= 15) {
    start = atUtc(year, month, 15);
    end = atUtc(year, month, second - 1);
  } else {
    const previousMonth = month === 1 ? 12 : month - 1;
    const previousYear = month === 1 ? year - 1 : year;
    start = atUtc(previousYear, previousMonth, secondPayday(previousYear, previousMonth));
    end = atUtc(year, month, 14);
  }
  return {
    key: dateOnly(start), start: dateOnly(start), end: dateOnly(end), today,
    daysRemaining: Math.max(0, Math.round((end.getTime() - atUtc(year, month, day).getTime()) / DAY_MS) + 1),
  };
}

export function calculatePaydayAmounts(input: {
  plannedIncome: number; paidFixed: number; otherSpent: number; futureFixed: number; daysRemaining: number;
}) {
  const round = (value: number) => Math.round(value * 100) / 100;
  const deductions = input.paidFixed + input.otherSpent + input.futureFixed;
  const available = Math.max(input.plannedIncome - deductions, 0);
  return {
    available: round(available), overage: round(Math.max(deductions - input.plannedIncome, 0)),
    dailyAvailable: round(input.daysRemaining > 0 ? available / input.daysRemaining : 0),
  };
}
