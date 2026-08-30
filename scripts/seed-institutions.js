const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to local DB...');
  
  // 1. Create financial_institutions table if it does not exist
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "InstitutionStatus" AS ENUM ('PILOT', 'ACTIVE', 'COMING_SOON', 'DISABLED');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "financial_institutions" (
      "code" TEXT NOT NULL,
      "display_name" TEXT NOT NULL,
      "status" "InstitutionStatus" NOT NULL DEFAULT 'COMING_SOON',
      "sender_patterns" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "financial_institutions_pkey" PRIMARY KEY ("code")
    );
  `);

  // 2. Insert institutions
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

  console.log('Successfully seeded financial_institutions!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
