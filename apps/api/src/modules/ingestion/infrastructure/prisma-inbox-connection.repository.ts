import { prisma } from '../../../config/database';

export class PrismaInboxConnectionRepository {
  findActiveGoogleByEmail(email: string) {
    return prisma.inboxConnection.findMany({
      where: {
        provider: 'GOOGLE',
        status: 'ACTIVE',
        institutionSubscriptions: { some: { enabled: true } },
        OR: [{ providerAccountId: email }, { email }],
      },
      select: { id: true, workspaceId: true },
    });
  }
}
