import { AppError } from '../../../errors/app-error';
import { ruleFingerprint } from '../domain/preview-decision';
import type { RuleApplications, RuleApplicationUnitOfWork } from './rule-application.port';

export class RetryRuleApplication {
  constructor(private readonly unit: RuleApplicationUnitOfWork, private readonly queries: RuleApplications) {}
  async execute(workspaceId: string, id: string) {
    await this.unit.run(workspaceId, async (session) => {
      const job = await session.get(id);
      if (!job) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Aplicación no encontrada.');
      if (job.status !== 'FAILED') throw new AppError(409, 'APPLICATION_NOT_FAILED', 'La operación no requiere reintento.');
      if (await session.active()) throw new AppError(409, 'RULE_APPLICATION_ACTIVE', 'Espera a que termine la operación en curso.');
      if (ruleFingerprint(await session.rules()) !== job.fingerprint) throw new AppError(409, 'PREVIEW_STALE', 'Las reglas cambiaron. Genera una nueva vista previa.');
      await session.queue(id, job.phase);
    });
    return this.queries.get(workspaceId, id);
  }
}
