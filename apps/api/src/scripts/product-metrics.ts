import { connectDB, disconnectDB, prisma } from '../config/database';

async function run() {
  await connectDB();
  const since = new Date(Date.now() - 7 * 86_400_000);
  const [events, scheduled, accepted, delivered, deliveryStatuses] = await Promise.all([
    prisma.productEvent.findMany({
      where: { occurredAt: { gte: since } },
      select: { name: true, profileId: true, workspaceId: true },
    }),
    prisma.emailDelivery.count({ where: { createdAt: { gte: since } } }),
    prisma.emailDelivery.count({ where: { acceptedAt: { gte: since } } }),
    prisma.emailDelivery.count({ where: { deliveredAt: { gte: since } } }),
    prisma.emailDelivery.groupBy({
      by: ['status'], where: { updatedAt: { gte: since }, status: { in: ['FAILED', 'BOUNCED', 'COMPLAINED', 'SUPPRESSED', 'UNKNOWN'] } },
      _count: { _all: true },
    }),
  ]);
  const metrics = new Map<string, { events: number; profiles: Set<string>; workspaces: Set<string> }>();
  for (const event of events) {
    const item = metrics.get(event.name) || { events: 0, profiles: new Set<string>(), workspaces: new Set<string>() };
    item.events += 1; item.profiles.add(event.profileId); item.workspaces.add(event.workspaceId);
    metrics.set(event.name, item);
  }
  console.table([...metrics].map(([name, item]) => ({
    event: name, events: item.events, profiles: item.profiles.size, workspaces: item.workspaces.size,
  })));
  const deliveryCounts = new Map(deliveryStatuses.map((item) => [item.status, item._count._all]));
  console.table([
    { metric: 'email_scheduled', count: scheduled },
    { metric: 'email_accepted', count: accepted },
    { metric: 'email_delivered', count: delivered },
    ...(['FAILED', 'BOUNCED', 'COMPLAINED', 'SUPPRESSED', 'UNKNOWN'] as const).map((status) => ({
      metric: `email_${status.toLowerCase()}`, count: deliveryCounts.get(status) || 0,
    })),
  ]);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : 'No se pudieron calcular las métricas.');
  process.exitCode = 1;
}).finally(() => disconnectDB());
