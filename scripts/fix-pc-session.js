const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.fxijnufrdixjvizeynir:billsPasswordSecur@aws-0-us-west-2.pooler.supabase.com:5432/postgres',
    },
  },
});

async function main() {
  const currentAuthUser = await prisma.$queryRawUnsafe('SELECT id, email FROM auth.users LIMIT 1;');
  console.log('Current active auth user:', currentAuthUser);

  if (currentAuthUser.length > 0) {
    const authId = currentAuthUser[0].id;
    const email = currentAuthUser[0].email;

    const existingProfile = await prisma.profile.findUnique({ where: { email } });
    if (existingProfile && existingProfile.id !== authId) {
      console.log(`Migrating profile from ${existingProfile.id} to ${authId}...`);
      
      const memberships = await prisma.workspaceMember.findMany({
        where: { profileId: existingProfile.id },
      });

      await prisma.profile.delete({ where: { id: existingProfile.id } });

      await prisma.profile.create({
        data: {
          id: authId,
          email,
          displayName: existingProfile.displayName,
          timezone: existingProfile.timezone,
          defaultCurrency: existingProfile.defaultCurrency,
          onboardingCompletedAt: existingProfile.onboardingCompletedAt,
          productGuideVersionSeen: existingProfile.productGuideVersionSeen,
          productGuideCompletedVersion: existingProfile.productGuideCompletedVersion,
          productGuideCompletedAt: existingProfile.productGuideCompletedAt,
        },
      });

      for (const m of memberships) {
        await prisma.workspaceMember.create({
          data: {
            workspaceId: m.workspaceId,
            profileId: authId,
            role: m.role,
          },
        });
      }
      console.log('✔ Profile and workspace migrated to current active session.');
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
