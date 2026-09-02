import { AnalyticsService } from './modules/analytics/application/analytics.service';
import { PrismaAnalyticsRepository } from './modules/analytics/infrastructure/prisma-analytics.repository';
import { AnalyticsController } from './modules/analytics/http/analytics.controller';
import { CategoryRuleApplicationService, PrismaCategoryRuleRepository, CategoryRuleController,
  SaveCategoryRule, ListExpenseCategories, PrismaRuleCatalog, CategorizeTransaction,
  PrismaRuleApplications, ProcessRuleApplication, RuleApplicationRunner, RuleApplicationController,
  PreviewRuleApplication, ConfirmRuleApplication, RetryRuleApplication, PrismaRuleApplicationUnit } from './modules/categorization';
import { PrismaClassificationCandidates, PrismaClassificationWriter } from './modules/transactions';
import { TransactionApplicationService } from './modules/transactions/application/transaction-application.service';
import { TransactionHttpController } from './modules/transactions/http/transaction.controller';
import { ReadinessController } from './modules/system/http/readiness.controller';
import { PrismaReadinessRepository } from './modules/system/infrastructure/prisma-readiness.repository';
import { IdentityApplicationService } from './modules/identity/application/identity.service';
import { PrismaProfileRepository } from './modules/identity/infrastructure/prisma-profile.repository';
import { IdentityController } from './modules/identity/http/identity.controller';
import { FinancialReportService } from './modules/reports/application/financial-report.service';
import { FinancialReportController } from './modules/reports/http/financial-report.controller';
import { config } from './config';
import { GoogleGmailClient } from './modules/connections/infrastructure/google/google-gmail.client';
import { GmailTokenProvider } from './modules/connections/infrastructure/gmail-token.provider';
import { GmailQueryService } from './modules/connections/infrastructure/gmail-query.service';
import { PrismaGmailConnectionReader } from './modules/connections/infrastructure/prisma-gmail-connection.reader';
import { GmailLifecycleService } from './modules/connections/infrastructure/gmail-lifecycle.service';
import { GmailMessageProcessor } from './modules/ingestion/infrastructure/gmail/gmail-message.processor';
import { GmailSyncService } from './modules/ingestion/infrastructure/gmail/gmail-sync.service';
import { GmailJobHandlerRegistry } from './modules/ingestion/application/gmail-job-handler.registry';
import { IngestionScheduler } from './modules/ingestion/infrastructure/ingestion-scheduler';
import { IngestionJobService } from './modules/ingestion/infrastructure/ingestion-job.service';
import { IngestionRunner } from './ingestion/ingestion-runner';
import { HandleGmailPush } from './modules/ingestion/application/handle-gmail-push';
import { GoogleOidcAdapter } from './modules/ingestion/providers/google/google-oidc.adapter';
import { PrismaInboxConnectionRepository } from './modules/ingestion/infrastructure/prisma-inbox-connection.repository';
import { GmailPubSubController } from './controllers/gmail-pubsub.controller';
import { InboxConnectionController } from './controllers/inbox-connection.controller';
import { InstitutionSelectionService } from './modules/connections/infrastructure/institution-selection.service';
import { MaintenanceController } from './controllers/maintenance.controller';
import { AccountService } from './modules/account/infrastructure/account.service';
import { AccountController } from './controllers/account.controller';
import { LegalService } from './modules/legal/infrastructure/legal.service';
import { WorkspaceService } from './modules/identity/infrastructure/workspace.service';
import { PrismaTransactionWriter } from './modules/transactions/infrastructure/prisma-transaction.writer';
import { PrismaTransactionQuery } from './modules/transactions/infrastructure/prisma-transaction.query';
import { PrismaReversalService } from './modules/transactions/infrastructure/prisma-reversal.service';
import { NormalizedEmailProcessor } from './modules/ingestion/infrastructure/normalized-email.processor';
import { FinancialInstitutionService } from './modules/connections/infrastructure/financial-institution.service';
import { BankConnectionController } from './controllers/bank-connection.controller';
import { LegalController } from './controllers/legal.controller';
import {
  BudgetController, GetMonthlyBudget, ListBudgetCategories, PrismaBudgetExpenseReadModel,
  PrismaBudgetRepository, ReplaceMonthlyBudget, SuggestBudget,
} from './modules/budgets';

const analyticsService = new AnalyticsService(new PrismaAnalyticsRepository());
const ruleRepository = new PrismaCategoryRuleRepository();
const ruleCatalog = new PrismaRuleCatalog();
const expenseCategories = new ListExpenseCategories(ruleCatalog);
const categorizer = new CategorizeTransaction(ruleRepository);
const ruleApplications = new PrismaRuleApplications((tx) => new PrismaClassificationWriter(tx));
const ruleApplicationUnit = new PrismaRuleApplicationUnit();
const previewRuleApplication = new PreviewRuleApplication(ruleApplicationUnit, ruleApplications);
const confirmRuleApplication = new ConfirmRuleApplication(ruleApplicationUnit, ruleApplications);
const retryRuleApplication = new RetryRuleApplication(ruleApplicationUnit, ruleApplications);
const ruleApplicationRunner = new RuleApplicationRunner(new ProcessRuleApplication(ruleApplications, new PrismaClassificationCandidates()));
const budgetRepository = new PrismaBudgetRepository();
const budgetExpenses = new PrismaBudgetExpenseReadModel();
const budgetCategories = new ListBudgetCategories(budgetExpenses, expenseCategories);
const getMonthlyBudget = new GetMonthlyBudget(budgetRepository, budgetExpenses);
const budgetController = new BudgetController({
  getMonthly: getMonthlyBudget,
  replaceMonthly: new ReplaceMonthlyBudget(budgetRepository, budgetCategories, getMonthlyBudget),
  suggest: new SuggestBudget(budgetExpenses, budgetCategories),
  listCategories: budgetCategories,
});
const categoryRuleService = new CategoryRuleApplicationService(ruleRepository,
  new SaveCategoryRule(ruleRepository, expenseCategories, ruleCatalog), expenseCategories, ruleCatalog);
const transactionWriter = new PrismaTransactionWriter(
  categorizer,
  new PrismaReversalService()
);
const transactionService = new TransactionApplicationService(
  transactionWriter,
  new PrismaTransactionQuery()
);
const googleGmailClient = new GoogleGmailClient(
  config.googleOAuthClientId,
  config.googleOAuthClientSecret,
  config.googleOAuthRedirectUri
);
const gmailTokenProvider = new GmailTokenProvider(googleGmailClient);
const gmailQueryService = new GmailQueryService();
const gmailLifecycleService = new GmailLifecycleService(
  googleGmailClient,
  new PrismaGmailConnectionReader(),
  {
    record: LegalService.recordGoogleConsent.bind(LegalService),
    revoke: LegalService.revokeGoogleConsent.bind(LegalService),
  }
);
const gmailMessageProcessor = new GmailMessageProcessor(
  googleGmailClient,
  new NormalizedEmailProcessor(transactionService)
);
const gmailSyncService = new GmailSyncService(
  googleGmailClient,
  gmailTokenProvider,
  gmailQueryService,
  gmailMessageProcessor
);
const gmailJobHandlers = new GmailJobHandlerRegistry(gmailSyncService);
let ingestionJobService!: IngestionJobService;
const ingestionScheduler = new IngestionScheduler((input) => ingestionJobService.enqueue(input));
ingestionJobService = new IngestionJobService(gmailJobHandlers, ingestionScheduler);
const ingestionRunner = new IngestionRunner(ingestionJobService);
const gmailPushHandler = new HandleGmailPush(
  new GoogleOidcAdapter(),
  new PrismaInboxConnectionRepository(),
  ingestionJobService
);
const inboxConnectionController = new InboxConnectionController(
  gmailLifecycleService,
  ingestionJobService,
  { replace: InstitutionSelectionService.replace.bind(InstitutionSelectionService) }
);

export const appContainer = {
  ruleApplicationRunner,
  ruleApplicationController: new RuleApplicationController({
    preview: previewRuleApplication.execute.bind(previewRuleApplication),
    confirm: confirmRuleApplication.execute.bind(confirmRuleApplication),
    retry: retryRuleApplication.execute.bind(retryRuleApplication),
    get: ruleApplications.get.bind(ruleApplications), recent: ruleApplications.recent.bind(ruleApplications),
  }),
  budgetController,
  analyticsController: new AnalyticsController(analyticsService),
  categoryRuleController: new CategoryRuleController(categoryRuleService),
  transactionController: new TransactionHttpController(transactionService),
  financialReportController: new FinancialReportController(new FinancialReportService(analyticsService, transactionService, getMonthlyBudget)),
  readinessController: new ReadinessController(new PrismaReadinessRepository()),
  identityController: new IdentityController(new IdentityApplicationService(
    new PrismaProfileRepository(),
    { bootstrap: WorkspaceService.bootstrap.bind(WorkspaceService) },
    { hasCurrentRequired: LegalService.hasCurrentRequired.bind(LegalService) }
  )),
  gmailPubSubController: new GmailPubSubController(gmailPushHandler),
  inboxConnectionController,
  maintenanceController: new MaintenanceController(ingestionRunner),
  gmailLifecycleService,
  gmailSyncService,
  ingestionJobService,
  ingestionRunner,
  accountController: new AccountController(new AccountService(gmailLifecycleService, budgetRepository, ruleRepository)),
  workspaceService: WorkspaceService,
  legalService: LegalService,
  legalController: new LegalController({
    current: LegalService.current.bind(LegalService),
    accept: LegalService.accept.bind(LegalService),
  }),
  bankConnectionController: new BankConnectionController(new FinancialInstitutionService()),
};
