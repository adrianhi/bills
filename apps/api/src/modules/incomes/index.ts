export { IncomeService } from './application/income.service';
export { PrismaIncomeRepository } from './infrastructure/prisma-income.repository';
export { IncomeController } from './http/income.controller';
export { calculateProjectedStreamMonthly, projectTotalMonthlyIncome } from './domain/income-projection';
