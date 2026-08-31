import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import type { AccountService } from '../modules/account/infrastructure/account.service';

const DeleteAccountSchema = z.object({ confirmation: z.literal('DELETE_MY_ACCOUNT') });

export class AccountController {
  public constructor(private readonly accounts: AccountService) {}

  public exportData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.accounts.exportData(req.auth!.user.id);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="bills-account-export-${new Date().toISOString().slice(0, 10)}.json"`
      );
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  public remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      DeleteAccountSchema.parse(req.body);
      await this.accounts.deleteAccount(req.auth!.user.id);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  };
}
