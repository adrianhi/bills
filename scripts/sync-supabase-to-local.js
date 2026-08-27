const { PrismaClient } = require('@prisma/client');

const sourceDatabaseUrl = process.env.SUPABASE_DATABASE_URL;
const targetDatabaseUrl = process.env.LOCAL_DATABASE_URL;
if (!sourceDatabaseUrl || !targetDatabaseUrl) {
  throw new Error('SUPABASE_DATABASE_URL and LOCAL_DATABASE_URL are required.');
}

const supabasePrisma = new PrismaClient({
  datasources: {
    db: {
      url: sourceDatabaseUrl
    }
  }
});

const localPrisma = new PrismaClient({
  datasources: {
    db: {
      url: targetDatabaseUrl
    }
  }
});

async function main() {
  console.log('📥 Obteniendo transacciones desde Supabase...');
  const txs = await supabasePrisma.transaction.findMany();
  console.log('Encontradas ' + txs.length + ' transacciones en Supabase.');

  console.log('📤 Copiando a base de datos PostgreSQL local...');
  let copied = 0;
  for (const tx of txs) {
    const existing = await localPrisma.transaction.findFirst({
      where: {
        workspaceId: tx.workspaceId,
        institutionCode: tx.institutionCode,
        externalId: tx.externalId,
      },
    });
    if (existing) await localPrisma.transaction.update({ where: { id: existing.id }, data: tx });
    else await localPrisma.transaction.create({ data: tx });
    copied++;
  }
  console.log('✅ Sincronización completa: ' + copied + ' transacciones en base de datos local.');
}

main()
  .catch(e => console.error('Error sincronizando:', e.message))
  .finally(async () => {
    await supabasePrisma.$disconnect();
    await localPrisma.$disconnect();
  });
