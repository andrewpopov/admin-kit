#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const packageRoot = new URL('..', import.meta.url).pathname;
const pkg = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
const expectedExports = ['defineAdminConsole', 'normalizeAdminFailure', 'AdminActionButton', 'AdminConsole'];
const workDir = mkdtempSync(join(tmpdir(), 'admin-kit-verify-'));

function run(command, args, options = {}) {
  return execFileSync(command, args, { encoding: 'utf8', ...options });
}

function fail(message) {
  console.error(`\n[verify:pack] FAIL: ${message}\n`);
  process.exit(1);
}

try {
  console.log('[verify:pack] Building...');
  run('npm', ['run', 'build'], { cwd: packageRoot, stdio: 'inherit' });

  for (const file of ['dist/index.js', 'dist/index.d.ts', 'dist/styles.css', 'dist/admin-kit-conformance.mjs']) {
    if (!existsSync(join(packageRoot, file))) fail(`${file} is missing after build.`);
  }

  console.log('[verify:pack] Packing tarball...');
  const packed = JSON.parse(run('npm', ['pack', '--json', '--pack-destination', workDir], { cwd: packageRoot }));
  const tarballPath = join(workDir, packed[0].filename);
  const contents = run('tar', ['-tzf', tarballPath]);
  for (const file of ['package/dist/index.js', 'package/dist/index.d.ts', 'package/dist/styles.css', 'package/dist/admin-kit-conformance.mjs']) {
    if (!contents.includes(file)) fail(`${file} is missing from the tarball.`);
  }

  const consumerDir = join(workDir, 'consumer');
  run('mkdir', ['-p', consumerDir]);
  writeFileSync(join(consumerDir, 'package.json'), JSON.stringify({ name: 'admin-kit-consumer', private: true }, null, 2));
  console.log('[verify:pack] Installing tarball into a throwaway React consumer...');
  run('npm', ['install', '--no-audit', '--no-fund', tarballPath, 'react@18.3.1', 'react-dom@18.3.1'], { cwd: consumerDir, stdio: 'inherit' });

  const smoke = `
    const mod = require('${pkg.name}');
    const missing = ${JSON.stringify(expectedExports)}.filter((name) => typeof mod[name] !== 'function');
    if (missing.length) {
      console.error('Missing exports: ' + missing.join(', '));
      process.exit(2);
    }
    require('${pkg.name}/core');
    require('${pkg.name}/react');
    require('${pkg.name}/testing');
    console.log('CJS exports OK');
  `;
  writeFileSync(join(consumerDir, 'smoke.cjs'), smoke);
  if (!run('node', ['smoke.cjs'], { cwd: consumerDir }).includes('CJS exports OK')) {
    fail('CommonJS consumer smoke did not report success.');
  }
  writeFileSync(join(consumerDir, 'src.tsx'), `import '${pkg.name}/styles.css';\nexport const App = () => <div />;`);
  if (!run('node', ['node_modules/.bin/admin-kit-conformance'], { cwd: consumerDir }).includes('PASS')) {
    fail('Conformance binary did not accept a valid consumer.');
  }

  console.log('[verify:pack] PASS: tarball installs and exports its public surface.');
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
