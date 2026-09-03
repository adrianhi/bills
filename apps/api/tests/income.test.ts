import { describe, expect, it } from 'vitest';
import {
  calculateProjectedStreamMonthly,
  projectTotalMonthlyIncome,
  type ProjectableIncomeStream,
} from '../src/modules/incomes/domain/income-projection';

describe('income projection domain', () => {
  const biweeklyStream: ProjectableIncomeStream = {
    id: 'stream-1',
    name: 'Nómina Quincenal',
    amount: 45000,
    currency: 'DOP',
    frequency: 'BIWEEKLY_15_30',
    isActive: true,
  };

  const monthlyStream: ProjectableIncomeStream = {
    id: 'stream-2',
    name: 'Consultoría Mensual',
    amount: 25000,
    currency: 'DOP',
    frequency: 'MONTHLY',
    isActive: true,
  };

  const weeklyStream: ProjectableIncomeStream = {
    id: 'stream-3',
    name: 'Clases Semanales',
    amount: 5000,
    currency: 'DOP',
    frequency: 'WEEKLY',
    isActive: true,
  };

  it('calculates projected monthly amount for biweekly payroll (15/30)', () => {
    const projected = calculateProjectedStreamMonthly(biweeklyStream, 'DOP');
    expect(projected).toBe(90000); // 45,000 * 2
  });

  it('calculates projected monthly amount for monthly frequency', () => {
    const projected = calculateProjectedStreamMonthly(monthlyStream, 'DOP');
    expect(projected).toBe(25000);
  });

  it('calculates projected monthly amount for weekly frequency', () => {
    const projected = calculateProjectedStreamMonthly(weeklyStream, 'DOP');
    expect(projected).toBe(20000); // 5,000 * 4
  });

  it('ignores inactive streams or mismatched currencies', () => {
    const inactive = { ...biweeklyStream, isActive: false };
    expect(calculateProjectedStreamMonthly(inactive, 'DOP')).toBe(0);

    const usdStream = { ...biweeklyStream, currency: 'USD' };
    expect(calculateProjectedStreamMonthly(usdStream, 'DOP')).toBe(0);
    expect(calculateProjectedStreamMonthly(usdStream, 'USD')).toBe(90000);
  });

  it('aggregates multiple active income streams correctly', () => {
    const total = projectTotalMonthlyIncome([biweeklyStream, monthlyStream, weeklyStream], 'DOP');
    expect(total).toBe(90000 + 25000 + 20000); // 135,000
  });
});
