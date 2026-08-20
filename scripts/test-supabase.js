const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres.fxijnufrdixjvizeynir:bhd_secret_token_123456@aws-0-us-west-2.pooler.supabase.com:5432/postgres'
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
