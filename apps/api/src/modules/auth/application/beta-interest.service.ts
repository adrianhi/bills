import { betaInterestInputSchema, type BetaInterestInput } from '@bills/contracts';

export interface BetaInterestRepository {
  findByEmail(email: string): Promise<{ id: string; email: string } | null>;
  create(data: { email: string; source?: string; campaignCode?: string; referredBy?: string }): Promise<{ id: string; email: string }>;
}

export class BetaInterestService {
  constructor(private readonly repository: BetaInterestRepository) {}

  async register(input: BetaInterestInput): Promise<{ success: true; message: string; alreadyRegistered?: boolean }> {
    const parsed = betaInterestInputSchema.parse(input);
    const normalizedEmail = parsed.email.trim().toLowerCase();

    const existing = await this.repository.findByEmail(normalizedEmail);
    if (existing) {
      return {
        success: true,
        message: '¡Ya estás en la lista de espera! Te contactaremos tan pronto abramos nuevos cupos.',
        alreadyRegistered: true,
      };
    }

    await this.repository.create({
      email: normalizedEmail,
      source: parsed.source || 'LANDING_DIRECT',
      campaignCode: parsed.campaignCode,
      referredBy: parsed.referredBy,
    });

    return {
      success: true,
      message: '¡Listo! Te has registrado en la lista de espera de la beta privada.',
    };
  }
}
