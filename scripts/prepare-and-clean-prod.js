const { PrismaClient } = require('@prisma/client');

const prodDirectUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || 'postgresql://postgres.fxijnufrdixjvizeynir:billsPasswordSecur@aws-0-us-west-2.pooler.supabase.com:5432/postgres';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: prodDirectUrl,
    },
  },
});

async function main() {
  console.log('🔗 Conectando a Supabase Producción (bills-prod - fxijnufrdixjvizeynir)...');

  // 1. Seed / Update Financial Institutions
  console.log('\n1. Actualizando instituciones financieras (BHD, Qik, Banreservas)...');
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
  console.log('  ✔ Instituciones financieras actualizadas.');

  // 2. Clean test data
  console.log('\n2. Limpiando datos de prueba en producción...');
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
      "beta_invites"
    CASCADE;
  `);
  console.log('  ✔ Tablas de datos de usuario limpiadas con éxito.');

  // 3. Enable RLS on all tables in public schema
  console.log('\n3. Asegurando Row Level Security (RLS) en todas las tablas de producción...');
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
  console.log(`  ✔ RLS activo y acceso público bloqueado en las ${tables.length} tablas.`);

  console.log('\n✅ BASE DE DATOS DE PRODUCCIÓN LISTA, ASEGURADA Y LIMPIA PARA ONBOARDING FRESCO.');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
