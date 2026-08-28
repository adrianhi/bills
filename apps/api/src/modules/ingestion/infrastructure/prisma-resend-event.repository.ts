import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';

export class PrismaResendEventRepository {
  findAddress(localParts: string[]) { return prisma.ingestionAddress.findFirst({ where: { aliasToken: { in: localParts }, isActive: true }, include: { bankConnection: true } }); }
  async create(input: { workspaceId: string; bankConnectionId: string; providerEventId: string; providerEmailId: string }) {
    try { await prisma.ingestionEvent.create({ data: { ...input, status: 'PENDING' } }); return 'created' as const; }
    catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return 'duplicate' as const; throw error; }
  }
}
