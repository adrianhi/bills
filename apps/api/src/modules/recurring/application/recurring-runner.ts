import type { RecurringJobProcessor } from './recurring.ports';
import { logger } from '../../../shared/observability/logger';

const delay = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export class RecurringRunner {
  private running = false;
  private loopPromise: Promise<void> | null = null;
  private activeCycle: Promise<boolean> | null = null;
  private nextScheduleAt = 0;

  constructor(private readonly jobs: RecurringJobProcessor) {}

  start() {
    if (this.running) return;
    this.running = true;
    this.loopPromise = this.loop();
    logger.info('recurring_runner_started');
  }

  async stop(timeoutMs = 25_000) {
    this.running = false;
    if (this.loopPromise) await Promise.race([this.loopPromise, delay(timeoutMs)]);
    logger.info('recurring_runner_stopped');
  }

  async maintenanceTick(timeBudgetMs = 4_000) {
    const started = Date.now();
    let processed = 0;
    while (Date.now() - started < timeBudgetMs && await this.runCycle(true)) processed += 1;
    return { recurringProcessed: processed };
  }

  private async loop() {
    while (this.running) {
      try {
        if (!await this.runCycle(false)) await delay(3_000);
      } catch (error) {
        logger.error('recurring_runner_cycle_failed', { errorName: error instanceof Error ? error.name : 'UnknownError' });
        await delay(5_000);
      }
    }
  }

  private runCycle(forceSchedule: boolean) {
    if (this.activeCycle) return this.activeCycle;
    this.activeCycle = this.performCycle(forceSchedule).finally(() => { this.activeCycle = null; });
    return this.activeCycle;
  }

  private async performCycle(forceSchedule: boolean) {
    if (forceSchedule || Date.now() >= this.nextScheduleAt) {
      await this.jobs.scheduleDue();
      this.nextScheduleAt = Date.now() + 60_000;
    }
    return this.jobs.processNext();
  }
}
