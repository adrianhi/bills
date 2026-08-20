const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.fxijnufrdixjvizeynir:bhd_secret_token_123456@aws-0-us-west-2.pooler.supabase.com:5432/postgres'
    }
  }
});

async function main() {
  const count = await prisma.transaction.count();
  const sample = await prisma.transaction.findMany({
    take: 5,
    orderBy: { transactionDate: 'desc' },
    select: { merchant: true, amount: true, currency: true, category: true, transactionDate: true }
  });
  console.log('Total transacciones en Supabase:', count);
  console.log('Muestra reciente:', sample);
}

main()
  .catch(e => console.error('Error:', e.message))
  .finally(() => prisma.$disconnect());
