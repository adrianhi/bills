import { prisma } from '../../../config/database';

export class PrismaReadinessRepository {
  async inspect() {
    await prisma.$queryRaw`SELECT 1`;
    const stalledIngestion = await prisma.ingestionJob.count({
      where: { status: 'PROCESSING', leaseUntil: { lt: new Date() } },
    });
    const stalledEmail = typeof prisma.emailDelivery?.count === 'function'
      ? await prisma.emailDelivery.count({ where: { status: 'PROCESSING', leaseUntil: { lt: new Date() } } })
      : 0;
    const stalledJobs = stalledIngestion + stalledEmail;
    return { database: 'ready' as const, workerQueue: stalledJobs ? 'degraded' as const : 'ready' as const, stalledJobs };
  }
}
