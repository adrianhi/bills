import type { IngestionJobProcessor } from '../modules/ingestion/application/ingestion-job.port';
import { logger } from '../shared/observability/logger';

type CycleResult = {
  gmailProcessed: boolean;
};

const delay = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

/**
 * Coordinates Gmail ingestion in the API process. Database leases remain
 * the source of truth, so an HTTP cron tick and the resident loop can safely race.
 */
export class IngestionRunner {
  private running = false;
  private loopPromise: Promise<void> | null = null;
  private activeCycle: Promise<CycleResult> | null = null;
  private nextScheduleAt = 0;

  public constructor(private readonly jobs: IngestionJobProcessor) {}

  public start() {
    if (this.running) return;
    this.running = true;
    this.loopPromise = this.loop();
    logger.info('ingestion_runner_started');
  }

  public async stop(timeoutMs = 25_000) {
    this.running = false;
    const pending = this.loopPromise;
    if (pending) await Promise.race([pending, delay(timeoutMs)]);
    logger.info('ingestion_runner_stopped');
  }

  public async maintenanceTick(timeBudgetMs = 8_000) {
    const startedAt = Date.now();
    let gmailProcessed = 0;
    let firstCycle = true;

    while (Date.now() - startedAt < timeBudgetMs) {
      const result = await this.runCycle(firstCycle);
      firstCycle = false;
      if (result.gmailProcessed) gmailProcessed += 1;
      if (!result.gmailProcessed) break;
    }

    return { gmailProcessed, durationMs: Date.now() - startedAt };
  }

  private async loop() {
    while (this.running) {
      try {
        const result = await this.runCycle(false);
        if (!result.gmailProcessed) await delay(3_000);
      } catch (error) {
        logger.error('embedded_worker_cycle_failed', {
          errorName: error instanceof Error ? error.name : 'UnknownError',
        });
        await delay(5_000);
      }
    }
  }

  private runCycle(forceSchedule: boolean): Promise<CycleResult> {
    if (this.activeCycle) return this.activeCycle;
    this.activeCycle = this.performCycle(forceSchedule).finally(() => {
      this.activeCycle = null;
    });
    return this.activeCycle;
  }

  private async performCycle(forceSchedule: boolean): Promise<CycleResult> {
    const now = Date.now();
    if (forceSchedule || now >= this.nextScheduleAt) {
      await this.jobs.scheduleDue();
      this.nextScheduleAt = now + 60_000;
    }

    const gmailProcessed = await this.jobs.processNext();
    return { gmailProcessed };
  }
}
