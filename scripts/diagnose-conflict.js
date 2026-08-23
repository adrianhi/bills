const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- PROFILES ---');
  const profiles = await prisma.profile.findMany();
  console.log(profiles);

  console.log('\n--- WORKSPACES ---');
  const workspaces = await prisma.workspace.findMany();
  console.log(workspaces);

  console.log('\n--- WORKSPACE MEMBERS ---');
  const members = await prisma.workspaceMember.findMany();
  console.log(members);

  console.log('\n--- TRANSACTIONS (workspaceId count) ---');
  const nullWs = await prisma.transaction.count({ where: { workspaceId: null } });
  const withWs = await prisma.transaction.count({ where: { NOT: { workspaceId: null } } });
  console.log({ nullWorkspaceTransactions: nullWs, assignedWorkspaceTransactions: withWs });

  console.log('\n--- CATEGORY RULES (workspaceId count) ---');
  const nullRules = await prisma.categoryRule.count({ where: { workspaceId: null } });
  const withRules = await prisma.categoryRule.count({ where: { NOT: { workspaceId: null } } });
  console.log({ nullWorkspaceRules: nullRules, assignedWorkspaceRules: withRules });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
