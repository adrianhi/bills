import { logger } from '../../../shared/observability/logger';

export class RuleApplicationRunner {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running = false;
  private pending: Promise<unknown> = Promise.resolve();
  constructor(private readonly processor: { processNext(): Promise<boolean> }) {}
  start() {
    if (this.running) return;
    this.running = true;
    this.schedule(0);
  }
  async stop() {
    this.running = false;
    clearTimeout(this.timer);
    await this.pending;
  }
  private schedule(delay: number) {
    if (!this.running) return;
    this.timer = setTimeout(() => {
      this.pending = this.processor.processNext().then((processed) => this.schedule(processed ? 50 : 3000)).catch(() => {
        logger.error('rule_application_worker_failed');
        this.schedule(5000);
      });
    }, delay);
  }
}
