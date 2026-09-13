import { prisma } from '../../../config/database';
import type { BetaInterestRepository } from '../application/beta-interest.service';

export class PrismaBetaInterestRepository implements BetaInterestRepository {
  async findByEmail(email: string) {
    return prisma.betaInterest.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
  }

  async create(data: { email: string; source?: string; campaignCode?: string; referredBy?: string }) {
    return prisma.betaInterest.create({
      data,
      select: { id: true, email: true },
    });
  }
}
