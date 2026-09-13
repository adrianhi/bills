/**
 * Cuadre - Logical Database Backup Utility
 * Exports all public database tables, records and metadata into a secure timestamped backup.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dotenv = require('dotenv');

// Load environment variables
const root = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(root, '.env') });
dotenv.config({ path: path.join(root, 'apps', 'api', '.env') });

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('Error: DIRECT_URL or DATABASE_URL is required for backup.');
  process.exit(1);
}

const { PrismaClient } = require(path.join(root, 'node_modules', '@prisma', 'client'));
const prisma = new PrismaClient({
  datasources: { db: { url: dbUrl } },
  log: ['error'],
});

async function runBackup() {
  const startedAt = new Date();
  const dateStr = startedAt.toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(root, 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  console.log(`[backup] Starting logical backup at ${startedAt.toISOString()}...`);

  // 1. Fetch public table names
  const tableRows = await prisma.$queryRaw`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE '_prisma%'
    ORDER BY table_name ASC;
  `;

  const tables = tableRows.map((r) => r.table_name);
  console.log(`[backup] Found ${tables.length} public tables to export.`);

  const backupData = {
    version: '1.0.0',
    createdAt: startedAt.toISOString(),
    databaseHost: new URL(dbUrl.replace(/^postgresql:\/\//, 'http://')).host,
    tables: {},
    manifest: {
      totalTables: tables.length,
      totalRows: 0,
    },
  };

  let totalRows = 0;
  for (const table of tables) {
    // Safe quote identifier
    const safeName = `"${table.replace(/"/g, '""')}"`;
    const rows = await prisma.$queryRawUnsafe(`SELECT * FROM ${safeName};`);
    backupData.tables[table] = rows;
    totalRows += rows.length;
    console.log(`  ✔ Table ${table}: ${rows.length} rows`);
  }

  backupData.manifest.totalRows = totalRows;

  // 2. Serialize and compute SHA-256 integrity hash
  const jsonContent = JSON.stringify(backupData, null, 2);
  const hash = crypto.createHash('sha256').update(jsonContent).digest('hex');
  backupData.manifest.sha256 = hash;

  const fileName = `cuadre-backup-${dateStr}.json`;
  const filePath = path.join(backupDir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf8');

  const durationMs = Date.now() - startedAt.getTime();
  const sizeKb = (Buffer.byteLength(jsonContent, 'utf8') / 1024).toFixed(2);

  console.log(`\n[backup] Backup complete in ${durationMs}ms!`);
  console.log(`[backup] Output: ${filePath} (${sizeKb} KB)`);
  console.log(`[backup] SHA-256: ${hash}`);
  console.log(`[backup] Total rows exported: ${totalRows} across ${tables.length} tables.`);

  await prisma.$disconnect();
}

runBackup().catch(async (err) => {
  console.error('[backup] Fatal backup error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
