const { spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const testUrl = process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/bills_test?schema=public';
const environment = { ...process.env, NODE_ENV: 'test', DATABASE_URL: testUrl, DIRECT_URL: testUrl, TEST_DATABASE_URL: testUrl };
const run = (command, args, cwd = root) => {
  const result = spawnSync(command, args, { cwd, env: environment, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) process.exit(result.status || 1);
};

run('npx', ['prisma', 'migrate', 'deploy'], path.join(root, 'apps/api'));
run('npm', ['run', 'test', '--prefix', 'apps/api']);
