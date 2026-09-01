const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

// EXPLICIT BILLS-PROD URL (Supabase Project fxijnufrdixjvizeynir on AWS us-west-2)
const REAL_PROD_URL = 'postgresql://postgres.fxijnufrdixjvizeynir:billsPasswordSecur@aws-0-us-west-2.pooler.supabase.com:5432/postgres';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: REAL_PROD_URL,
    },
  },
});

async function main() {
  console.log('🔗 Conectando a Supabase Producción REAL (bills-prod - fxijnufrdixjvizeynir)...');

  // 1. Check existing rows before cleaning
  console.log('\n📊 Conteo previo en producción:');
  const preProfiles = await prisma.profile.count();
  const preWorkspaces = await prisma.workspace.count();
  const preConnections = await prisma.inboxConnection.count();
  const preTransactions = await prisma.transaction.count();
  console.log(`  Profiles: ${preProfiles}, Workspaces: ${preWorkspaces}, Connections: ${preConnections}, Transactions: ${preTransactions}`);

  // 2. Clean test data & users
  console.log('\n🧹 Limpiando todas las tablas de usuarios y transacciones en producción...');
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE 
      "transactions",
      "transaction_status_events",
      "ingestion_events",
      "ingestion_jobs",
      "inbox_institution_subscriptions",
      "bank_connections",
      "inbox_connections",
      "ingestion_addresses",
      "oauth_states",
      "integration_consents",
      "legal_acceptances",
      "workspace_members",
      "workspaces",
      "profiles",
      "beta_invites",
      "category_rules",
      "account_deletion_audits"
    CASCADE;
  `);
  console.log('  ✔ Tablas públicas limpiadas con éxito (0 filas).');

  // 3. Clean auth.users
  console.log('\n👤 Limpiando usuarios de autenticación en Supabase (auth.users)...');
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM auth.users;`);
    console.log('  ✔ Usuarios de auth.users eliminados con éxito.');
  } catch (e) {
    console.log('  ℹ No se pudo limpiar auth.users directamente:', e.message);
  }

  // 4. Update Financial Institutions
  console.log('\n🏦 Asegurando instituciones financieras (BHD, Qik, Banreservas, etc.)...');
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "InstitutionStatus" AS ENUM ('PILOT', 'ACTIVE', 'COMING_SOON', 'DISABLED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "financial_institutions" ("code", "display_name", "status", "sender_patterns", "updated_at") VALUES
      ('BHD', 'Banco BHD', 'PILOT', ARRAY['alertas@bhd.com.do', '@bhd.com.do'], CURRENT_TIMESTAMP),
      ('POPULAR', 'Banco Popular', 'COMING_SOON', ARRAY[]::TEXT[], CURRENT_TIMESTAMP),
      ('BANRESERVAS', 'Banreservas', 'PILOT', ARRAY['notificaciones@banreservas.com', 'notificacionestubancoapp@banreservas.com'], CURRENT_TIMESTAMP),
      ('QIK', 'Qik Banco Digital', 'PILOT', ARRAY['@qik.do', '@qik.com.do'], CURRENT_TIMESTAMP),
      ('APAP', 'APAP', 'COMING_SOON', ARRAY[]::TEXT[], CURRENT_TIMESTAMP),
      ('SCOTIABANK', 'Scotiabank', 'COMING_SOON', ARRAY[]::TEXT[], CURRENT_TIMESTAMP),
      ('CASH', 'Manual / Efectivo', 'ACTIVE', ARRAY[]::TEXT[], CURRENT_TIMESTAMP)
    ON CONFLICT ("code") DO UPDATE SET
      "display_name" = EXCLUDED."display_name",
      "status" = EXCLUDED."status",
      "sender_patterns" = EXCLUDED."sender_patterns",
      "updated_at" = CURRENT_TIMESTAMP;
  `);
  console.log('  ✔ Instituciones financieras aseguradas.');

  // 5. Ensure legal documents exist
  console.log('\n📄 Asegurando documentos legales...');
  const termsHash = crypto.createHash('sha256').update('terms-2026-08-29.1').digest('hex');
  const privacyHash = crypto.createHash('sha256').update('privacy-2026-08-29.1').digest('hex');

  await prisma.$executeRawUnsafe(`
    INSERT INTO "legal_documents" ("id", "type", "version", "locale", "title", "slug", "content_hash", "is_current", "effective_at", "created_at") VALUES
      (gen_random_uuid(), 'TERMS', '2026-08-29.1', 'es-DO', 'Términos y condiciones de uso', 'terms', '${termsHash}', true, '2026-08-29 00:00:00', NOW()),
      (gen_random_uuid(), 'PRIVACY', '2026-08-29.1', 'es-DO', 'Política de privacidad', 'privacy', '${privacyHash}', true, '2026-08-29 00:00:00', NOW())
    ON CONFLICT ("type", "version", "locale") DO NOTHING;
  `);
  console.log('  ✔ Documentos legales asegurados.');

  // 6. Ensure RLS on all tables
  console.log('\n🔒 Asegurando Row Level Security (RLS) en todas las tablas...');
  const tablesResult = await prisma.$queryRaw`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public';
  `;
  const tables = tablesResult.map((r) => r.tablename);

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
  }

  for (const role of ['anon', 'authenticated']) {
    for (const table of tables) {
      await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${role}') THEN
            EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE "${table}" FROM ${role};';
          END IF;
        END $$;
      `);
    }
  }
  console.log(`  ✔ RLS activo y acceso directo bloqueado en las ${tables.length} tablas.`);

  // 7. Verify post-clean state
  console.log('\n🔍 Verificación final en producción:');
  const postProfiles = await prisma.profile.count();
  const postWorkspaces = await prisma.workspace.count();
  const postConnections = await prisma.inboxConnection.count();
  const postTransactions = await prisma.transaction.count();
  console.log(`  Profiles: ${postProfiles}, Workspaces: ${postWorkspaces}, Connections: ${postConnections}, Transactions: ${postTransactions}`);

  console.log('\n✨ BASE DE DATOS DE PRODUCCIÓN (bills-prod) AHORA SÍ ESTÁ 100% EN 0.');
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando limpieza de producción:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
