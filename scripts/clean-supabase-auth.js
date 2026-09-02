const { PrismaClient } = require('@prisma/client');
const prodDirectUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || 'postgresql://postgres.fxijnufrdixjvizeynir:billsPasswordSecur@aws-0-us-west-2.pooler.supabase.com:5432/postgres';
const prisma = new PrismaClient({ datasources: { db: { url: prodDirectUrl } } });

async function main() {
  try {
    await prisma.$executeRawUnsafe('DELETE FROM auth.users;');
    console.log('✔ auth.users wiped successfully.');
  } catch (e) {
    console.log('ℹ auth.users cleanup note:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
