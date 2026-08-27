const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 VERIFICANDO ORIGEN DE LOS DATOS...');

  // 1. Check Inbox Connection
  const inboxes = await prisma.inboxConnection.findMany({
    include: { workspace: true },
  });
  console.log('\n--- 1. CONEXIÓN DE GMAIL ACTIVA ---');
  for (const inbox of inboxes) {
    console.log({
      id: inbox.id,
      emailAddress: inbox.emailAddress,
      provider: inbox.provider,
      status: inbox.status,
      historyId: inbox.historyId,
      lastSyncAt: inbox.lastSyncAt,
      createdAt: inbox.createdAt,
    });
  }

  // 2. Check Transactions created via GMAIL_OAUTH
  const gmailTxs = await prisma.transaction.findMany({
    where: { ingestionChannel: 'GMAIL_OAUTH' },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\n--- 2. TRANSACCIONES EXTRAÍDAS DIRECTO DE GMAIL API (${gmailTxs.length} encontradas) ---`);
  for (const tx of gmailTxs.slice(0, 10)) {
    console.log({
      id: tx.id,
      merchant: tx.merchant,
      rawMerchant: tx.rawMerchant,
      amount: `${tx.currency} ${tx.amount}`,
      transactionDate: tx.transactionDate,
      ingestionChannel: tx.ingestionChannel,
      source: tx.source,
      externalId: tx.externalId,
      createdAt_insertedInDb: tx.createdAt,
    });
  }

  // 3. Check legacy rows count (where workspaceId is null)
  const legacyCount = await prisma.transaction.count({ where: { workspaceId: null } });
  console.log(`\n--- 3. TRANSACCIONES HISTÓRICAS VIEJAS (DESVINCULADAS EN NULL): ${legacyCount} ---`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
