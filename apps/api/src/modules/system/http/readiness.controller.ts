import type { Request, Response } from 'express';
import { PrismaReadinessRepository } from '../infrastructure/prisma-readiness.repository';

export class ReadinessController {
  constructor(private readonly repository: PrismaReadinessRepository) {}
  handle = async (_req: Request, res: Response) => {
    const checks = await this.repository.inspect();
    res.status(checks.workerQueue === 'ready' ? 200 : 503).json({ status: checks.workerQueue === 'ready' ? 'ready' : 'degraded', checks, timestamp: new Date().toISOString() });
  };
}
