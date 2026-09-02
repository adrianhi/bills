const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.fxijnufrdixjvizeynir:billsPasswordSecur@aws-0-us-west-2.pooler.supabase.com:5432/postgres',
    },
  },
});

async function main() {
  const users = await prisma.$queryRawUnsafe('SELECT id, email, created_at FROM auth.users;');
  console.log('auth.users count:', users.length);
  console.log(users);

  const profiles = await prisma.profile.findMany();
  console.log('\nprofiles count:', profiles.length);
  console.log(profiles);

  const members = await prisma.workspaceMember.findMany({ include: { workspace: true } });
  console.log('\nworkspace members count:', members.length);
  console.log(members);

  await prisma.$disconnect();
}

main().catch(console.error);
