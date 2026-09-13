import type { Request, Response } from 'express';
import { betaInterestInputSchema } from '@bills/contracts';
import type { BetaInterestService } from '../application/beta-interest.service';

export class BetaInterestController {
  constructor(private readonly service: BetaInterestService) {}

  register = async (req: Request, res: Response) => {
    const input = betaInterestInputSchema.parse(req.body);
    const result = await this.service.register(input);
    res.status(200).json(result);
  };
}
