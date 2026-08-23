const { PrismaClient } = require('@prisma/client');

const databaseUrl = process.env.SUPABASE_DATABASE_URL;
if (!databaseUrl) throw new Error('SUPABASE_DATABASE_URL is required.');
if (process.env.CONFIRM_TRUNCATE_SUPABASE !== 'TRUNCATE_TRANSACTIONS') {
  throw new Error('Set CONFIRM_TRUNCATE_SUPABASE=TRUNCATE_TRANSACTIONS to confirm this destructive action.');
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});

async function main() {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE transactions;');
  const count = await prisma.transaction.count();
  console.log('✅ BASE DE DATOS DE SUPABASE LIMPIA.');
  console.log('Total de transacciones actuales en Supabase:', count);
}

main()
  .catch(e => console.error('❌ Error limpiando Supabase:', e.message))
  .finally(() => prisma.$disconnect());
