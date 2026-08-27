const fs = require('node:fs');
fs.mkdirSync(new URL('../dist/cjs/', `file:///${__filename.replaceAll('\\', '/')}`), { recursive: true });
fs.writeFileSync(new URL('../dist/cjs/package.json', `file:///${__filename.replaceAll('\\', '/')}`), '{"type":"commonjs"}\n');
