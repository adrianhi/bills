import { connectDB, disconnectDB, prisma } from '../config/database';

async function run() {
  await connectDB();
  const since = new Date(Date.now() - 7 * 86_400_000);
  const events = await prisma.productEvent.findMany({
    where: { occurredAt: { gte: since } },
    select: { name: true, profileId: true, workspaceId: true },
  });
  const metrics = new Map<string, { events: number; profiles: Set<string>; workspaces: Set<string> }>();
  for (const event of events) {
    const item = metrics.get(event.name) || { events: 0, profiles: new Set<string>(), workspaces: new Set<string>() };
    item.events += 1; item.profiles.add(event.profileId); item.workspaces.add(event.workspaceId);
    metrics.set(event.name, item);
  }
  console.table([...metrics].map(([name, item]) => ({
    event: name, events: item.events, profiles: item.profiles.size, workspaces: item.workspaces.size,
  })));
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : 'No se pudieron calcular las métricas.');
  process.exitCode = 1;
}).finally(() => disconnectDB());
