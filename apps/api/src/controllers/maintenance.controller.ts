import crypto from 'crypto';
import { Request, Response } from 'express';
import { config } from '../config';
import { AppError } from '../errors/app-error';
import type { IngestionRunner } from '../ingestion/ingestion-runner';
import type { RecurringRunner } from '../modules/recurring';
import type { EngagementService } from '../modules/engagement';

function authorized(header: string | undefined) {
  if (!config.maintenanceSecret || !header?.startsWith('Bearer ')) return false;
  const received = Buffer.from(header.slice('Bearer '.length));
  const expected = Buffer.from(config.maintenanceSecret);
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

export class MaintenanceController {
  public constructor(
    private readonly ingestionRunner: IngestionRunner,
    private readonly recurringRunner: RecurringRunner,
    private readonly engagement: EngagementService,
  ) {}

  public tick = async (req: Request, res: Response) => {
    if (!config.maintenanceSecret) {
      throw new AppError(503, 'MAINTENANCE_DISABLED', 'Maintenance endpoint is not configured.');
    }
    if (!authorized(req.header('authorization'))) {
      throw new AppError(401, 'INVALID_MAINTENANCE_TOKEN', 'Maintenance token is invalid.');
    }
    const [ingestion, recurring] = await Promise.all([
      this.ingestionRunner.maintenanceTick(4_000),
      this.recurringRunner.maintenanceTick(4_000),
      this.engagement.pruneExpired(),
    ]);
    res.status(200).json({ success: true, data: { ...ingestion, ...recurring } });
  };
}
