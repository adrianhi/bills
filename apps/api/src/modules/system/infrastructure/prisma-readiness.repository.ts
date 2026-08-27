import { prisma } from '../../../config/database';

export class PrismaReadinessRepository {
  async inspect() {
    await prisma.$queryRaw`SELECT 1`;
    const stalledJobs = await prisma.ingestionJob.count({
      where: { status: 'PROCESSING', leaseUntil: { lt: new Date() } },
    });
    return { database: 'ready' as const, workerQueue: stalledJobs ? 'degraded' as const : 'ready' as const, stalledJobs };
  }
}
