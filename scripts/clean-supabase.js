const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.fxijnufrdixjvizeynir:bhd_secret_token_123456@aws-0-us-west-2.pooler.supabase.com:5432/postgres'
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
