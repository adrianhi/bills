const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'spending_budget_limits';
  `);
  console.log('Dev DB Table Verification (cnedhjfwaxtbvszqgqcb):', result);

  const institutions = await prisma.financialInstitution.findMany();
  console.log('Financial Institutions count:', institutions.length);

  await prisma.$disconnect();
}

main().catch(console.error);
