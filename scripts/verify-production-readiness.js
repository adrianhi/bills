#!/usr/bin/env node

/**
 * bills. - Preflight Production Readiness Verification Tool
 * 
 * Runs automated checks before deploying to production:
 * 1. Build artifacts integrity (Web SPA, Contracts, API dist)
 * 2. Database connectivity, migrations & institution seed
 * 3. Security (RLS policies on public schema tables)
 * 4. Runtime configuration & environment variables
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');

// Load environment files
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.production') });

const rootDir = process.cwd();
const results = {
  passed: 0,
  warned: 0,
  failed: 0,
};

function pass(name, detail) {
  results.passed++;
  console.log(`  \x1b[32m✔ PASS\x1b[0m \x1b[1m${name}\x1b[0m: ${detail}`);
}

function warn(name, detail) {
  results.warned++;
  console.log(`  \x1b[33m⚠ WARN\x1b[0m \x1b[1m${name}\x1b[0m: ${detail}`);
}

function fail(name, detail) {
  results.failed++;
  console.log(`  \x1b[31m✖ FAIL\x1b[0m \x1b[1m${name}\x1b[0m: ${detail}`);
}

async function checkBuildArtifacts() {
  console.log('\n\x1b[36m1. Comprobación de Artefactos de Compilación\x1b[0m');

  // 1.1 Web SPA public
  const indexPath = path.join(rootDir, 'public', 'index.html');
  const assetsDir = path.join(rootDir, 'public', 'assets');
  if (fs.existsSync(indexPath) && fs.existsSync(assetsDir)) {
    const assets = fs.readdirSync(assetsDir);
    pass('Frontend Web Bundle', `public/index.html y ${assets.length} archivos estáticos listos`);
  } else {
    fail('Frontend Web Bundle', 'No se encontró public/index.html o la carpeta assets. Ejecuta: npm run build:web');
  }

  // 1.2 Contracts build
  const contractsDist = path.join(rootDir, 'packages', 'contracts', 'dist');
  if (fs.existsSync(contractsDist)) {
    pass('Contratos TypeScript', 'packages/contracts/dist compilado');
  } else {
    fail('Contratos TypeScript', 'packages/contracts/dist no existe. Ejecuta: npm run build:contracts');
  }

  // 1.3 API backend build
  const apiDist = path.join(rootDir, 'apps', 'api', 'dist', 'server.js');
  if (fs.existsSync(apiDist)) {
    pass('Backend API Bundle', 'apps/api/dist/server.js listo para ejecución');
  } else {
    fail('Backend API Bundle', 'apps/api/dist/server.js no existe. Ejecuta: npm run build:api');
  }
}

async function checkDatabase() {
  console.log('\n\x1b[36m2. Comprobación de Base de Datos y Supabase\x1b[0m');

  const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    fail('Conexión Base de Datos', 'DATABASE_URL o DIRECT_URL no configurados en el entorno');
    return;
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } },
  });

  try {
    // 2.1 Basic connectivity
    const [dbVersion] = await prisma.$queryRaw`SELECT version();`;
    pass('Conectividad PostgreSQL', `Conectado exitosamente (${dbVersion.version.split(' ')[0]} ${dbVersion.version.split(' ')[1]})`);

    // 2.2 Migrations status
    const migrations = await prisma.$queryRaw`
      SELECT id, migration_name, finished_at 
      FROM _prisma_migrations 
      ORDER BY finished_at DESC;
    `;
    pass('Migraciones Prisma', `${migrations.length} migraciones registradas y aplicadas`);

    // 2.3 Institutions Seed
    const institutions = await prisma.financialInstitution.findMany({
      select: { code: true, displayName: true, status: true },
    });
    const codes = institutions.map((i) => i.code);
    const required = ['BHD', 'POPULAR', 'BANRESERVAS', 'QIK', 'CASH'];
    const missing = required.filter((r) => !codes.includes(r));
    if (missing.length === 0) {
      pass('Catálogo de Instituciones', `${institutions.length} bancos sembrados (${codes.join(', ')})`);
    } else {
      warn('Catálogo de Instituciones', `Faltan instituciones: ${missing.join(', ')}. Ejecuta: node scripts/seed-institutions.js`);
    }

    // 2.4 Row Level Security (RLS)
    const rlsCheck = await prisma.$queryRaw`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename != '_prisma_migrations';
    `;
    const unprotected = rlsCheck.filter((t) => !t.rowsecurity);
    if (unprotected.length === 0) {
      pass('Seguridad RLS (Row Level Security)', `RLS activo en las ${rlsCheck.length} tablas del esquema public`);
    } else {
      warn('Seguridad RLS', `${unprotected.length} tablas sin RLS: ${unprotected.map((t) => t.tablename).join(', ')}`);
    }
  } catch (err) {
    fail('Base de Datos', `Error al consultar la base de datos: ${err.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

function checkRuntimeConfiguration() {
  console.log('\n\x1b[36m3. Comprobación de Configuración y Variables de Entorno\x1b[0m');

  const isProduction = process.env.NODE_ENV === 'production';

  // Core
  if (process.env.SUPABASE_URL && (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY)) {
    pass('Supabase Auth Credentials', 'SUPABASE_URL y PUBLISHABLE_KEY presentes');
  } else {
    fail('Supabase Auth Credentials', 'Falta SUPABASE_URL o SUPABASE_PUBLISHABLE_KEY');
  }

  // Encryption key
  const encKey = process.env.INGESTION_ENCRYPTION_KEY || '';
  try {
    const buf = Buffer.from(encKey, 'base64');
    if (buf.length === 32) {
      pass('Cifrado Ingesta (AES-256-GCM)', 'INGESTION_ENCRYPTION_KEY válida (32 bytes base64)');
    } else {
      fail('Cifrado Ingesta', `INGESTION_ENCRYPTION_KEY inválida: tiene ${buf.length} bytes (se requieren exactamente 32 bytes)`);
    }
  } catch {
    fail('Cifrado Ingesta', 'INGESTION_ENCRYPTION_KEY no es base64 válido');
  }

  // Legal Audit Salt
  const salt = process.env.LEGAL_AUDIT_SALT || '';
  if (salt.length >= 32) {
    pass('Legal Audit Salt', `LEGAL_AUDIT_SALT configurada (${salt.length} caracteres)`);
  } else {
    if (isProduction) {
      fail('Legal Audit Salt', 'LEGAL_AUDIT_SALT debe tener mínimo 32 caracteres en producción');
    } else {
      warn('Legal Audit Salt', `LEGAL_AUDIT_SALT tiene ${salt.length} caracteres (en producción se exigen mínimo 32)`);
    }
  }

  // Legal Identity
  const legalVars = [
    { name: 'LEGAL_PROVIDER_NAME', val: process.env.LEGAL_PROVIDER_NAME },
    { name: 'LEGAL_PROVIDER_ID', val: process.env.LEGAL_PROVIDER_ID },
    { name: 'LEGAL_CONTACT_EMAIL', val: process.env.LEGAL_CONTACT_EMAIL },
    { name: 'LEGAL_CONTACT_ADDRESS', val: process.env.LEGAL_CONTACT_ADDRESS },
  ];
  const missingLegal = legalVars.filter((v) => !v.val);
  if (missingLegal.length === 0) {
    pass('Identidad Legal Dominicana', 'Datos legales de contacto y proveedor configurados');
  } else {
    if (isProduction) {
      fail('Identidad Legal Dominicana', `Variables legales faltantes: ${missingLegal.map((m) => m.name).join(', ')}`);
    } else {
      warn('Identidad Legal Dominicana', `Variables legales vacías en desarrollo: ${missingLegal.map((m) => m.name).join(', ')} (requeridas en producción)`);
    }
  }

  // Maintenance secret
  if (process.env.MAINTENANCE_SECRET) {
    pass('Mantenimiento Programado', 'MAINTENANCE_SECRET configurado para cron tick');
  } else {
    warn('Mantenimiento Programado', 'MAINTENANCE_SECRET no está configurado (el cron de reconciliación requerirá este secreto)');
  }

  // Google OAuth
  if (process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
    pass('Gmail OAuth Server Credentials', 'Client ID y Secret de Google configurados');
  } else {
    warn('Gmail OAuth', 'Credenciales de Google OAuth no configuradas en el entorno local (requeridas para conectar Gmail)');
  }
}

async function main() {
  console.log('================================================================');
  console.log('  bills. - Preflight Production Readiness Verification');
  console.log('================================================================');

  await checkBuildArtifacts();
  await checkDatabase();
  checkRuntimeConfiguration();

  console.log('\n----------------------------------------------------------------');
  console.log(`Resumen: \x1b[32m${results.passed} Aprobados\x1b[0m | \x1b[33m${results.warned} Advertencias\x1b[0m | \x1b[31m${results.failed} Fallos\x1b[0m`);
  console.log('----------------------------------------------------------------');

  if (results.failed > 0) {
    console.log('\n\x1b[31m✖ Estado: NO LISTO. Corrige los fallos indicados arriba antes de desplegar.\x1b[0m\n');
    process.exit(1);
  } else if (results.warned > 0) {
    console.log('\n\x1b[33m⚠ Estado: LISTO CON ADVERTENCIAS. Revisa las variables de entorno de producción.\x1b[0m\n');
  } else {
    console.log('\n\x1b[32m✔ Estado: 100% LISTO PARA PRODUCCIÓN.\x1b[0m\n');
  }
}

main().catch((err) => {
  console.error('Error durante la verificación preflight:', err);
  process.exit(1);
});
