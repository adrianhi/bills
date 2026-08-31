import crypto from 'crypto';
import { Request, Response } from 'express';
import { config } from '../config';
import { AppError } from '../errors/app-error';
import type { IngestionRunner } from '../ingestion/ingestion-runner';

function authorized(header: string | undefined) {
  if (!config.maintenanceSecret || !header?.startsWith('Bearer ')) return false;
  const received = Buffer.from(header.slice('Bearer '.length));
  const expected = Buffer.from(config.maintenanceSecret);
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

export class MaintenanceController {
  public constructor(private readonly ingestionRunner: IngestionRunner) {}

  public tick = async (req: Request, res: Response) => {
    if (!config.maintenanceSecret) {
      throw new AppError(503, 'MAINTENANCE_DISABLED', 'Maintenance endpoint is not configured.');
    }
    if (!authorized(req.header('authorization'))) {
      throw new AppError(401, 'INVALID_MAINTENANCE_TOKEN', 'Maintenance token is invalid.');
    }
    const result = await this.ingestionRunner.maintenanceTick();
    res.status(200).json({ success: true, data: result });
  };
}
