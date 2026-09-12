import { prisma } from '../../../config/database';

export class PrismaReadinessRepository {
  async inspect() {
    await prisma.$queryRaw`SELECT 1`;
    const [stalledIngestion, stalledEmail] = await Promise.all([
      prisma.ingestionJob.count({ where: { status: 'PROCESSING', leaseUntil: { lt: new Date() } } }),
      prisma.emailDelivery.count({ where: { status: 'PROCESSING', leaseUntil: { lt: new Date() } } }),
    ]);
    const stalledJobs = stalledIngestion + stalledEmail;
    return { database: 'ready' as const, workerQueue: stalledJobs ? 'degraded' as const : 'ready' as const, stalledJobs };
  }
}
