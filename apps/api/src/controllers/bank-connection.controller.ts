import type { NextFunction, Request, Response } from 'express';

interface InstitutionCatalog {
  listInstitutions(): Promise<unknown[]>;
}

export class BankConnectionController {
  public constructor(private readonly institutions: InstitutionCatalog) {}

  public list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(200).json({ success: true, data: await this.institutions.listInstitutions() });
    } catch (error) {
      next(error);
    }
  };
}
