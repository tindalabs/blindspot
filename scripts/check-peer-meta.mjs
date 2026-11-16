// Fails when a published package lists a dependency in peerDependenciesMeta
// without declaring it in peerDependencies. Package managers ignore such a meta
// entry, so the dependency gets no version range and is resolvable only when
// hoisting happens to provide it; publint and attw do not report it.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PACKAGES_DIR = 'packages';

const problems = [];
for (const dir of readdirSync(PACKAGES_DIR)) {
  const manifestPath = join(PACKAGES_DIR, dir, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const peers = manifest.peerDependencies ?? {};
  for (const name of Object.keys(manifest.peerDependenciesMeta ?? {})) {
    if (!(name in peers)) {
      problems.push(`${manifestPath}: "${name}" is in peerDependenciesMeta but not in peerDependencies`);
    }
  }
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('peerDependenciesMeta: every entry has a declared peer');
