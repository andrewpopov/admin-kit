#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const ignored = new Set(['node_modules', 'dist', '.git', '.worktree', 'coverage', 'test-results']);
const sourceFiles = [];

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
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
const packageManifest = readFileSync(join(root, 'package.json'), 'utf8');
if (!packageManifest.includes('"@andrewpopov/admin-kit"')) {
  errors.push('No package manifest declares @andrewpopov/admin-kit.');
}
if (!files.some(({ text }) => /['"]@andrewpopov\/admin-kit\/styles\.css['"]/.test(text))) {
  errors.push('Import @andrewpopov/admin-kit/styles.css from the application entry point.');
}
for (const { path, text } of files) {
  if (!/\.(?:tsx|jsx)$/.test(path)) continue;
  for (const match of text.matchAll(/<AdminApp\b([\s\S]*?)\/>|<AdminApp\b([\s\S]*?)>/g)) {
    const attributes = match[1] ?? match[2] ?? '';
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
