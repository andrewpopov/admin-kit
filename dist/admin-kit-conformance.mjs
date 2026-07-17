#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const packageVersion = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
const ignored = new Set(['node_modules', 'dist', '.git', '.next', '.worktree', 'coverage', 'test-results']);
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
  if (!/\.(?:tsx|jsx)$/.test(path)) continue;
  // Capture only the AdminApp opening tag's own attributes: consume
  // quoted attribute values (which may contain `>`) as opaque units so the
  // match stops at the tag's real closing `>`/`/>` instead of lazily
  // matching through to a later child element's `/>`.
  for (const match of text.matchAll(/<AdminApp\b((?:"[^"]*"|'[^']*'|[^>"'])*)\/?>/g)) {
    const attributes = match[1] ?? '';
    if (!/\bframe\s*=/.test(attributes)) errors.push(`${relative(root, path)}: AdminApp requires frame={{ title, description? }}.`);
  }
}
for (const { path, text } of files) {
  if (/\.css$/.test(path) && /--admin-kit-/.test(text)) {
    errors.push(`${relative(root, path)}: do not override Admin Kit core tokens; compose AdminCard, AdminField, or AdminStack instead.`);
  }
}
if (errors.length) fail(errors);
console.log(`[admin-kit-conformance] PASS: ${files.length} source files satisfy the core admin contract.`);
