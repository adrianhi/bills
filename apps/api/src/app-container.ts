import { AnalyticsService } from './modules/analytics/application/analytics.service';
import { PrismaAnalyticsRepository } from './modules/analytics/infrastructure/prisma-analytics.repository';
import { AnalyticsController } from './modules/analytics/http/analytics.controller';
import { CategoryRuleApplicationService } from './modules/categorization/application/category-rule.service';
import { PrismaCategoryRuleRepository } from './modules/categorization/infrastructure/prisma-category-rule.repository';
import { CategoryRuleController } from './modules/categorization/http/category-rule.controller';
import { TransactionApplicationService } from './modules/transactions/application/transaction-application.service';
import { TransactionHttpController } from './modules/transactions/http/transaction.controller';
import { ReadinessController } from './modules/system/http/readiness.controller';
import { PrismaReadinessRepository } from './modules/system/infrastructure/prisma-readiness.repository';
import { IdentityApplicationService } from './modules/identity/application/identity.service';
import { PrismaProfileRepository } from './modules/identity/infrastructure/prisma-profile.repository';
import { IdentityController } from './modules/identity/http/identity.controller';
import { FinancialReportService } from './modules/reports/application/financial-report.service';
import { FinancialReportController } from './modules/reports/http/financial-report.controller';

const analyticsService = new AnalyticsService(new PrismaAnalyticsRepository());
const categoryRuleService = new CategoryRuleApplicationService(new PrismaCategoryRuleRepository());
const transactionService = new TransactionApplicationService();

export const appContainer = {
  analyticsController: new AnalyticsController(analyticsService),
  categoryRuleController: new CategoryRuleController(categoryRuleService),
  transactionController: new TransactionHttpController(transactionService),
  financialReportController: new FinancialReportController(new FinancialReportService(analyticsService, transactionService)),
  readinessController: new ReadinessController(new PrismaReadinessRepository()),
  identityController: new IdentityController(new IdentityApplicationService(new PrismaProfileRepository())),
};
