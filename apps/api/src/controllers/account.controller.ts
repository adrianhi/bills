import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { AccountService } from '../services/account.service';

const DeleteAccountSchema = z.object({
  confirmation: z.literal('DELETE_MY_ACCOUNT'),
});

export class AccountController {
  public static async exportData(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AccountService.exportData(req.auth!.user.id);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="bills-account-export-${new Date().toISOString().slice(0, 10)}.json"`
      );
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  public static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      DeleteAccountSchema.parse(req.body);
      await AccountService.deleteAccount(req.auth!.user.id);
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}
