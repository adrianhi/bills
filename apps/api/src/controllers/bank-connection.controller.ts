import { NextFunction, Request, Response } from 'express';
import { BankConnectionService } from '../services/bank-connection.service';

export class BankConnectionController {
  public static async institutions(_req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json({ success: true, data: await BankConnectionService.listInstitutions() });
    } catch (error) {
      next(error);
    }
  }
}
