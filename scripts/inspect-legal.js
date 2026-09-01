const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.fxijnufrdixjvizeynir:billsPasswordSecur@aws-0-us-west-2.pooler.supabase.com:5432/postgres',
    },
  },
});

async function main() {
  const docs = await prisma.legalDocument.findMany();
  console.log('Legal documents count:', docs.length);
  console.log(docs.map(d => ({ id: d.id, type: d.type, version: d.version, isCurrent: d.isCurrent })));

  const accepts = await prisma.legalAcceptance.findMany({ include: { legalDocument: true } });
  console.log('\nLegal acceptances count:', accepts.length);
  console.log(accepts.map(a => ({ id: a.id, profileId: a.profileId, docType: a.legalDocument?.type, version: a.legalDocument?.version })));

  const profiles = await prisma.profile.findMany();
  console.log('\nProfiles:', profiles.map(p => ({ id: p.id, email: p.email })));

  await prisma.$disconnect();
}

main().catch(console.error);
