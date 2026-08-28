const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const webDirectory = path.join(root, 'apps', 'web');
const vitePackage = require.resolve('vite/package.json', { paths: [webDirectory] });
const viteBinary = path.join(path.dirname(vitePackage), 'bin', 'vite.js');

const result = spawnSync(process.execPath, [viteBinary, 'build'], {
  cwd: webDirectory,
  env: { ...process.env, NODE_ENV: 'production' },
  stdio: 'inherit',
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
