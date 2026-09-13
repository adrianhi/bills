const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
const schemaPath = path.join(root, 'apps', 'api', 'prisma', 'schema.prisma');
const isWin = process.platform === 'win32';
const prismaBinary = path.join(root, 'node_modules', '.bin', isWin ? 'prisma.cmd' : 'prisma');

const result = isWin
  ? spawnSync(`"${prismaBinary}" generate "--schema=${schemaPath}"`, { cwd: root, stdio: 'inherit', shell: true })
  : spawnSync(prismaBinary, ['generate', `--schema=${schemaPath}`], { cwd: root, stdio: 'inherit' });

if (result.status !== 0) {
  if (isWin) {
    console.warn(`[warn] Prisma generate exited with code ${result.status} (likely locked by local dev server on Windows). Continuing build...`);
  } else {
    process.exit(result.status ?? 1);
  }
}
