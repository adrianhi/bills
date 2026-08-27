const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const tables = [
  'profiles',
  'workspaces',
  'workspace_members',
  'financial_institutions',
  'bank_connections',
  'inbox_connections',
  'oauth_states',
  'legal_documents',
  'legal_acceptances',
  'integration_consents',
  'account_deletion_audits',
  'ingestion_addresses',
  'ingestion_events',
  'beta_invites',
  'transactions',
  'category_rules',
];

async function main() {
  console.log('Enabling RLS on all Supabase tables...');

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
    console.log(`  ✔ RLS activado en: ${table}`);
  }

  // Revoke public privileges
  for (const role of ['anon', 'authenticated']) {
    for (const table of tables) {
      await prisma.$executeRawUnsafe(`REVOKE ALL PRIVILEGES ON TABLE "${table}" FROM ${role};`);
    }
  }

  console.log('\n🛡️ ¡RLS ACTIVADO Y ACCESO PÚBLICO BLOQUEADO EN TODAS LAS TABLAS!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
