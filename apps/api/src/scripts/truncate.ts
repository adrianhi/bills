import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(__dirname, '../../../.env'),
  path.resolve(__dirname, '../../.env'),
];

for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

async function truncateDatabase(dbUrl: string, name: string) {
  const prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } },
  });
  try {
    const result = await prisma.transaction.deleteMany();
    console.log(`✅ [${name}] Se eliminaron ${result.count} transacciones exitosamente.`);
  } catch (err: any) {
    console.log(`⚠️  [${name}] No se pudo conectar o limpiar: ${err.message || err}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log('🧹 Limpiando bases de datos (Local y Supabase)...');

  // 1. Local PostgreSQL (Docker)
  await truncateDatabase('postgresql://postgres:postgres@localhost:5432/bills_db', 'Docker Local');

  // 2. Supabase Cloud (.env)
  if (process.env.DIRECT_URL || process.env.DATABASE_URL) {
    const cloudUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || '';
    await truncateDatabase(cloudUrl, 'Supabase Cloud');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error general:', err);
  process.exit(1);
});
