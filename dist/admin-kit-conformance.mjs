#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const packageVersion = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
const ignored = new Set(['node_modules', 'dist', '.git', '.next', '.worktree', 'coverage', 'test-results']);
const PUBLIC_THEME_TOKENS = new Set([
  'accent',
  'accent-strong',
  'accent-soft',
  'on-accent',
  'radius',
  'radius-sm',
  'dark-accent',
  'dark-accent-strong',
  'dark-accent-soft',
]);
const sourceFiles = [];
const packageManifests = [];

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.name === 'package.json') packageManifests.push(path);
    else if (/\.(?:[cm]?[jt]sx?|css)$/.test(entry.name)) sourceFiles.push(path);
  }
}

function fail(messages) {
  console.error('[admin-kit-conformance] FAIL');
  for (const message of messages) console.error(`- ${message}`);
  process.exit(1);
}

if (!existsSync(join(root, 'package.json'))) fail(['Run this command from a consumer repository root.']);
walk(root);
const files = sourceFiles.map((path) => ({ path, text: readFileSync(path, 'utf8') }));
const errors = [];
const adminKitSpecs = packageManifests.flatMap((path) => {
  const manifest = JSON.parse(readFileSync(path, 'utf8'));
  return ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']
    .map((field) => manifest[field]?.['@andrewpopov/admin-kit'])
    .filter(Boolean)
    .map((specifier) => ({ path, specifier }));
});
if (!adminKitSpecs.length) {
  errors.push('No package manifest declares @andrewpopov/admin-kit.');
}
for (const { path, specifier } of adminKitSpecs) {
  if (!String(specifier).includes(`v${packageVersion}`)) {
    errors.push(`${relative(root, path)}: pin @andrewpopov/admin-kit to v${packageVersion}.`);
  }
}
const entryFiles = files.filter(({ path }) => /(?:^|\/)(?:main|layout)\.(?:[cm]?[jt]sx?)$/.test(path));
if (!entryFiles.some(({ text }) => /['"]@andrewpopov\/admin-kit\/styles\.css['"]/.test(text))) {
  errors.push('Import @andrewpopov/admin-kit/styles.css from an application main or layout entry point.');
}
for (const { path, text } of files) {
  if (!/\.css$/.test(path)) continue;
  const rel = relative(root, path);
  for (const match of text.matchAll(/--admin-kit-([a-z0-9-]+)\s*:/g)) {
    const name = match[1];
    if (!PUBLIC_THEME_TOKENS.has(name)) {
      errors.push(
        `${rel}: --admin-kit-${name} is an internal Admin Kit token and cannot be overridden; only theme tokens (accent, accent-strong, accent-soft, on-accent, radius, radius-sm, dark-accent, dark-accent-strong, dark-accent-soft) may be set to rebrand.`,
      );
    }
  }
}
if (errors.length) fail(errors);
console.log(`[admin-kit-conformance] PASS: ${files.length} source files satisfy the core admin contract.`);
