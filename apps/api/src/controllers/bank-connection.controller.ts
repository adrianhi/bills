import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { BankConnectionService } from '../services/bank-connection.service';

const CreateConnectionSchema = z.object({
  institutionCode: z.string().min(2).max(32),
  sourceEmail: z.string().email().optional(),
});

export class BankConnectionController {
  public static async institutions(_req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json({ success: true, data: await BankConnectionService.listInstitutions() });
    } catch (error) {
      next(error);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json({ success: true, data: await BankConnectionService.list(req.auth!.workspaceId!) });
    } catch (error) {
      next(error);
    }
  }

  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = CreateConnectionSchema.parse(req.body);
      const connection = await BankConnectionService.create(
        req.auth!.workspaceId!,
        input.institutionCode,
        input.sourceEmail
      );
      res.status(201).json({ success: true, data: connection });
    } catch (error) {
      next(error);
    }
  }

  public static async rotate(req: Request, res: Response, next: NextFunction) {
    try {
      const address = await BankConnectionService.rotateAddress(req.auth!.workspaceId!, String(req.params.id));
      res.status(200).json({ success: true, data: address });
    } catch (error) {
      next(error);
    }
  }

  public static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await BankConnectionService.remove(req.auth!.workspaceId!, String(req.params.id));
      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }
}
