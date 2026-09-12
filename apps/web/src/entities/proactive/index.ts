export { proactiveService } from './api/proactive.service';
export {
  proactiveKeys,
  useProactiveFeed,
  useWeeklyCheckin,
  useCompleteWeeklyCheckin,
  useSimulateExpense,
  useWeeklyDigestPreview,
  useSendWeeklyDigestTest,
  useDismissProactiveAction,
} from './model/proactive.queries';
export type {
  ProactiveActionDto,
  ProactiveActionKind,
  ProactiveActionPriority,
  ProactiveFeedDto,
  WeeklyCheckinDto,
  SimulateExpenseInput,
  SimulateExpenseResultDto,
  SimulateExpenseCategoryImpactDto,
  WeeklyDigestPreviewDto,
  SendWeeklyDigestTestInput,
} from '@bills/contracts';


