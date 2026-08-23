const { PrismaClient } = require('@prisma/client');

const databaseUrl = process.env.SUPABASE_DATABASE_URL;
if (!databaseUrl) throw new Error('SUPABASE_DATABASE_URL is required.');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});

async function main() {
  const result = await prisma.$queryRawUnsafe('SELECT 1 as test');
  console.log('✅ CONEXION EXITOSA A SUPABASE:', result);
}

main()
  .catch(e => console.error('❌ Error de conexion:', e.message))
  .finally(() => prisma.$disconnect());
