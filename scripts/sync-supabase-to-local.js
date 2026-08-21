const { PrismaClient } = require('@prisma/client');

const supabasePrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.fxijnufrdixjvizeynir:bhd_secret_token_123456@aws-0-us-west-2.pooler.supabase.com:5432/postgres'
    }
  }
});

const localPrisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:postgres@localhost:5432/bills_db?schema=public'
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
    await localPrisma.transaction.upsert({
      where: { externalId: tx.externalId },
      update: tx,
      create: tx,
    });
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
