const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const violations = [];
const walk = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const target = path.join(directory, entry.name);
  return entry.isDirectory() ? walk(target) : [target];
});
const sourceFiles = (directory) => walk(path.join(root, directory)).filter((file) => /\.(ts|tsx)$/.test(file));

for (const file of sourceFiles('apps/web/src')) {
  const content = fs.readFileSync(file, 'utf8');
  const relative = path.relative(root, file).replaceAll('\\', '/');
  if (/\/ui\/.*\.tsx$/.test(relative) && /\b(fetch|axios|httpClient)\s*[.(]/.test(content)) violations.push(`${relative}: UI cannot perform HTTP requests`);
  if (/\/ui\/.*\.tsx$/.test(relative) && /supabase\.?auth/.test(content)) violations.push(`${relative}: UI cannot access Supabase Auth`);
  const sourceLayer = relative.split('/')[3];
  const ranks = { shared: 0, entities: 1, features: 2, widgets: 3, pages: 4, app: 5 };
  for (const match of content.matchAll(/from ['"]@\/(shared|entities|features|widgets|pages|app)\//g)) {
    if (ranks[sourceLayer] !== undefined && ranks[match[1]] > ranks[sourceLayer]) violations.push(`${relative}: ${sourceLayer} cannot import ${match[1]}`);
  }
}
for (const file of sourceFiles('apps/api/src')) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  const content = fs.readFileSync(file, 'utf8');
  if ((relative.includes('/controllers/') || relative.includes('/http/')) && /(config\/database|@prisma\/client)/.test(content)) violations.push(`${relative}: HTTP layer cannot import Prisma`);
  const directPrisma = /@prisma\/client|import\s+\{[^}]*\bprisma\b[^}]*\}\s+from\s+['"][^'"]*config\/database/.test(content);
  if (directPrisma && !relative.includes('/infrastructure/') && !relative.includes('/config/database.ts') && !relative.includes('/scripts/')) violations.push(`${relative}: Prisma is restricted to infrastructure adapters`);
}
if (violations.length) {
  console.error(`Architecture violations:\n${violations.map((item) => `- ${item}`).join('\n')}`);
  process.exit(1);
}
console.log('Architecture boundaries OK');
