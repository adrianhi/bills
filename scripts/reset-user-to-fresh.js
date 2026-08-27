const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function readArgument(name) {
  const prefix = `--${name}=`;
  const value = process.argv.find((argument) => argument.startsWith(prefix));
  return value ? value.slice(prefix.length).trim() : '';
}

async function main() {
  const targetEmail = readArgument('email').toLowerCase();
  const confirmation = readArgument('confirm').toLowerCase();

  if (!targetEmail || confirmation !== targetEmail) {
    throw new Error(
      'Uso seguro: node scripts/reset-user-to-fresh.js --email=usuario@dominio.com --confirm=usuario@dominio.com'
    );
  }

  const profile = await prisma.profile.findUnique({
    where: { email: targetEmail },
    include: {
      memberships: {
        include: { workspace: { include: { _count: { select: { members: true } } } } },
      },
    },
  });

  if (!profile) {
    console.log(`No existe un perfil para ${targetEmail}. No se modificó ningún dato.`);
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const membership of profile.memberships) {
      const workspaceId = membership.workspaceId;

      if (membership.workspace._count.members === 1) {
        // Preserve financial history without leaving it attached to a deleted account.
        await tx.transaction.updateMany({
          where: { workspaceId },
          data: { workspaceId: null },
        });
        await tx.categoryRule.updateMany({
          where: { workspaceId },
          data: { workspaceId: null },
        });
        await tx.workspace.delete({ where: { id: workspaceId } });
      } else {
        await tx.workspaceMember.delete({
          where: { workspaceId_profileId: { workspaceId, profileId: profile.id } },
        });
      }
    }

    await tx.profile.delete({ where: { id: profile.id } });
    await tx.betaInvite.upsert({
      where: { email: targetEmail },
      create: { email: targetEmail },
      update: { usedAt: null },
    });
  });

  console.log(`Cuenta ${targetEmail} restablecida sin modificar otros usuarios.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
