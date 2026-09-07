import type { RecurringRepository } from '../application/recurring.ports';
import { PrismaRecurringQuery } from './prisma-recurring-query';
import { PrismaRecurringScan } from './prisma-recurring-scan';

export class PrismaRecurringRepository implements RecurringRepository {
  private readonly query = new PrismaRecurringQuery();
  private readonly scan = new PrismaRecurringScan();

  ensureScanScheduled = this.query.ensureScanScheduled.bind(this.query);
  radar = this.query.radar.bind(this.query);
  create = this.query.create.bind(this.query);
  update = this.query.update.bind(this.query);
  acknowledgeAlert = this.query.acknowledgeAlert.bind(this.query);
  sumFutureThroughMonthEnd = this.query.sumFutureThroughMonthEnd.bind(this.query);
  sumFutureThrough = this.query.sumFutureThrough.bind(this.query);
  candidates = this.scan.candidates.bind(this.scan);
  observations = this.scan.observations.bind(this.scan);
  saveDetection = this.scan.saveDetection.bind(this.scan);
}
