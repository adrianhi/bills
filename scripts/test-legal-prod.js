const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.fxijnufrdixjvizeynir:billsPasswordSecur@aws-0-us-west-2.pooler.supabase.com:5432/postgres',
    },
  },
});

async function main() {
  const profile = await prisma.profile.findFirst();
  console.log('Profile on bills-prod:', profile);

  const currentDocs = await prisma.legalDocument.findMany({ where: { isCurrent: true } });
  console.log('Current docs:', currentDocs.map(d => ({ id: d.id, type: d.type, version: d.version })));

  if (profile) {
    const terms = currentDocs.find(d => d.type === 'TERMS');
    const privacy = currentDocs.find(d => d.type === 'PRIVACY');

    if (terms && privacy) {
      console.log('Creating legal acceptances for profile:', profile.id);
      await prisma.legalAcceptance.upsert({
        where: { profileId_legalDocumentId: { profileId: profile.id, legalDocumentId: terms.id } },
        create: { profileId: profile.id, legalDocumentId: terms.id, source: 'SIGNUP', locale: 'es-DO' },
        update: {},
      });
      await prisma.legalAcceptance.upsert({
        where: { profileId_legalDocumentId: { profileId: profile.id, legalDocumentId: privacy.id } },
        create: { profileId: profile.id, legalDocumentId: privacy.id, source: 'SIGNUP', locale: 'es-DO' },
        update: {},
      });
      console.log('✔ Legal acceptances created successfully in bills-prod!');
    }
  }

  const allAccepts = await prisma.legalAcceptance.findMany();
  console.log('\nAll acceptances now:', allAccepts);

  await prisma.$disconnect();
}

main().catch(console.error);
