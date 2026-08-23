const { PrismaClient } = require('@prisma/client');

const databaseUrl = process.env.SUPABASE_DATABASE_URL;
if (!databaseUrl) throw new Error('SUPABASE_DATABASE_URL is required.');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
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
