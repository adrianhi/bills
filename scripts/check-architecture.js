const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const violations = [];
const normalize = (value) => value.replaceAll('\\', '/');

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

function sourceFiles(directory) {
  return walk(path.join(root, directory)).filter((file) => /\.(ts|tsx)$/.test(file));
}

function changedSourceFiles() {
  try {
    const output = execFileSync('git', ['diff', '--name-only', 'develop', '--'], {
      cwd: root,
      encoding: 'utf8',
    });
    return new Set(output.trim().split(/\r?\n/).filter(Boolean).map(normalize));
  } catch {
    return new Set();
  }
}

const allFiles = [...sourceFiles('apps/web/src'), ...sourceFiles('apps/api/src')];
const relativeByFile = new Map(allFiles.map((file) => [file, normalize(path.relative(root, file))]));
const changed = changedSourceFiles();
const importPattern = /(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]/g;

function importsOf(content) {
  return [...content.matchAll(importPattern)].map((match) => match[1]);
}

function resolveSourceImport(sourceFile, specifier) {
  let candidate;
  if (specifier.startsWith('.')) {
    candidate = path.resolve(path.dirname(sourceFile), specifier);
  } else if (specifier.startsWith('@/') && normalize(sourceFile).includes('/apps/web/src/')) {
    candidate = path.join(root, 'apps/web/src', specifier.slice(2));
  } else {
    return null;
  }
  const candidates = [candidate, `${candidate}.ts`, `${candidate}.tsx`, path.join(candidate, 'index.ts'), path.join(candidate, 'index.tsx')];
  return candidates.find((item) => relativeByFile.has(item)) || null;
}

const graph = new Map();
for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  graph.set(file, importsOf(content).map((specifier) => resolveSourceImport(file, specifier)).filter(Boolean));
}

const visiting = new Set();
const visited = new Set();
function visit(file, stack) {
  if (visiting.has(file)) {
    const start = stack.indexOf(file);
    const cycle = [...stack.slice(start), file].map((item) => relativeByFile.get(item));
    violations.push(`Dependency cycle: ${cycle.join(' -> ')}`);
    return;
  }
  if (visited.has(file)) return;
  visiting.add(file);
  for (const dependency of graph.get(file) || []) visit(dependency, [...stack, file]);
  visiting.delete(file);
  visited.add(file);
}
for (const file of allFiles) visit(file, []);

const fsdRanks = { shared: 0, entities: 1, features: 2, widgets: 3, pages: 4, app: 5 };
for (const file of sourceFiles('apps/web/src')) {
  const content = fs.readFileSync(file, 'utf8');
  const relative = relativeByFile.get(file);
  const sourceParts = relative.split('/');
  const sourceLayer = sourceParts[3];
  const sourceSlice = sourceParts[4];

  if (/\/ui\/.*\.tsx$/.test(relative) && /\b(fetch|axios|httpClient)\s*[.(]/.test(content)) violations.push(`${relative}: UI cannot perform HTTP requests`);
  if (/\/ui\/.*\.tsx$/.test(relative) && /supabase\.?auth/.test(content)) violations.push(`${relative}: UI cannot access Supabase Auth`);

  for (const specifier of importsOf(content)) {
    const match = specifier.match(/^@\/(shared|entities|features|widgets|pages|app)(?:\/([^/]+))?(\/.*)?$/);
    if (!match) continue;
    const [, targetLayer, targetSlice, deepPath] = match;
    if (fsdRanks[sourceLayer] !== undefined && fsdRanks[targetLayer] > fsdRanks[sourceLayer]) violations.push(`${relative}: ${sourceLayer} cannot import ${targetLayer}`);
    if (sourceLayer === 'features' && targetLayer === 'features' && sourceSlice !== targetSlice) violations.push(`${relative}: features cannot depend on sibling feature ${targetSlice}`);
    if (changed.has(relative) && ['entities', 'features', 'widgets'].includes(targetLayer) && deepPath) violations.push(`${relative}: import ${specifier} through the slice public API`);
  }
}

for (const file of sourceFiles('apps/api/src')) {
  const relative = relativeByFile.get(file);
  const content = fs.readFileSync(file, 'utf8');
  const moduleMatch = relative.match(/^apps\/api\/src\/modules\/([^/]+)\/(domain|application|infrastructure|http)\//);
  const imports = importsOf(content);

  if ((relative.includes('/controllers/') || relative.includes('/http/')) && /(config\/database|@prisma\/client)/.test(content)) violations.push(`${relative}: HTTP layer cannot import Prisma`);
  const directPrisma = /@prisma\/client|import\s+\{[^}]*\bprisma\b[^}]*\}\s+from\s+['"][^'"]*config\/database/.test(content);
  if (directPrisma && !relative.includes('/infrastructure/') && !relative.includes('/config/database.ts') && !relative.includes('/scripts/')) violations.push(`${relative}: Prisma is restricted to infrastructure adapters`);

  if (moduleMatch) {
    const [, sourceModule, layer] = moduleMatch;
    if (layer === 'domain' && imports.some((item) => /infrastructure|\/http|config|services|@prisma|express/.test(item))) violations.push(`${relative}: domain must remain framework and infrastructure independent`);
    if (changed.has(relative) && layer === 'application' && imports.some((item) => /\/infrastructure\/|\/http\/|config\/database|\/services\//.test(item))) violations.push(`${relative}: application must depend on ports, not infrastructure`);
    if (changed.has(relative)) {
      for (const specifier of imports) {
        const target = specifier.match(/modules\/([^/]+)\/(domain|application|infrastructure|http)\//);
        if (target && target[1] !== sourceModule) violations.push(`${relative}: import module ${target[1]} through its public API`);
      }
    }
  }
}

for (const relative of changed) {
  if (!/^(apps\/(api|web)\/src)\/.*\.(ts|tsx)$/.test(relative)) continue;
  if (/\.(test|spec)\.(ts|tsx)$/.test(relative) || relative.includes('/fixtures/')) continue;
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) continue;
  const lines = fs.readFileSync(absolute, 'utf8').split(/\r?\n/).length;
  if (lines > 250) violations.push(`${relative}: modified runtime files cannot exceed 250 lines (${lines})`);
}

const uniqueViolations = [...new Set(violations)];
if (uniqueViolations.length) {
  console.error(`Architecture violations:\n${uniqueViolations.map((item) => `- ${item}`).join('\n')}`);
  process.exit(1);
}
console.log(`Architecture boundaries OK (${allFiles.length} files, no dependency cycles)`);
