import { z } from 'zod';
import { prisma } from '../config/database';

const EmailSchema = z.string().trim().toLowerCase().email();

async function main() {
  const parsed = EmailSchema.safeParse(process.argv[2]);
  if (!parsed.success) {
    throw new Error('Usage: npm run beta:invite -- user@example.com');
  }

  const invite = await prisma.betaInvite.upsert({
    where: { email: parsed.data },
    update: {},
    create: { email: parsed.data },
    select: { email: true, usedAt: true },
  });

  console.log(invite.usedAt ? `Invite already used: ${invite.email}` : `Invite ready: ${invite.email}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'Could not create beta invite.');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
