import type { PreviewRuleApplicationInput } from '@bills/contracts';
import { AppError } from '../../../errors/app-error';
import { ruleFingerprint } from '../domain/preview-decision';
import type { RuleApplications, RuleApplicationUnitOfWork } from './rule-application.port';

export class PreviewRuleApplication {
  constructor(private readonly unit: RuleApplicationUnitOfWork, private readonly queries: RuleApplications) {}
  async execute(workspaceId: string, ruleId: string, input: PreviewRuleApplicationInput) {
    const id = await this.unit.run(workspaceId, async (session) => {
      if (await session.active()) throw new AppError(409, 'RULE_APPLICATION_ACTIVE', 'Espera a que termine la operación en curso.');
      const rules = await session.rules();
      if (!rules.some((rule) => rule.id === ruleId && rule.isActive)) throw new AppError(404, 'RESOURCE_NOT_FOUND', 'Regla activa no encontrada.');
      return session.create(ruleId, input, rules, ruleFingerprint(rules));
    });
    return this.queries.get(workspaceId, id);
  }
}
