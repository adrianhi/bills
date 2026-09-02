import type { Request, Response } from 'express';
import { budgetCurrencySchema, budgetMonthSchema, replaceMonthlyBudgetSchema } from '@bills/contracts';
import { AppError } from '../../../errors/app-error';
import { requestContext } from '../../../shared/application/request-context';
import type { GetMonthlyBudget } from '../application/get-monthly-budget';
import type { ListBudgetCategories } from '../application/list-budget-categories';
import type { ReplaceMonthlyBudget } from '../application/replace-monthly-budget';
import type { SuggestBudget } from '../application/suggest-budget';
import { BudgetApplicationError } from '../application/budget-error';

function query(req: Request) {
  return {
    month: budgetMonthSchema.parse(req.query.month),
    currency: budgetCurrencySchema.parse(String(req.query.currency || '').toUpperCase()),
  };
}

async function translate<T>(operation: () => Promise<T>) {
  try { return await operation(); }
  catch (error) {
    if (error instanceof BudgetApplicationError) throw new AppError(error.statusCode, error.code, error.message);
    throw error;
  }
}

export class BudgetController {
  constructor(private readonly useCases: {
    getMonthly: GetMonthlyBudget; replaceMonthly: ReplaceMonthlyBudget;
    suggest: SuggestBudget; listCategories: ListBudgetCategories;
  }) {}

  monthly = async (req: Request, res: Response) => {
    const { actor } = requestContext(req); const input = query(req);
    res.status(200).json({ success: true, data: await this.useCases.getMonthly.execute(actor.workspaceId, input.month, input.currency) });
  };

  replace = async (req: Request, res: Response) => {
    const { actor } = requestContext(req); const input = replaceMonthlyBudgetSchema.parse(req.body);
    const data = await translate(() => this.useCases.replaceMonthly.execute(actor.workspaceId, input));
    res.status(200).json({ success: true, data });
  };

  suggestions = async (req: Request, res: Response) => {
    const { actor } = requestContext(req); const input = query(req);
    res.status(200).json({ success: true, data: await this.useCases.suggest.execute(actor.workspaceId, input.month, input.currency) });
  };

  categories = async (req: Request, res: Response) => {
    const { actor } = requestContext(req);
    res.status(200).json({ success: true, data: await this.useCases.listCategories.execute(actor.workspaceId) });
  };
}
