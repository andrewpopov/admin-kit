#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';

const root = process.cwd();
const packageVersion = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
const ignored = new Set([
  'node_modules',
  'dist',
  '.git',
  '.next',
  '.worktree',
  '.worktrees',
  '.claude',
  'coverage',
  'test-results',
]);
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
    // A nested directory carrying its own .git is a separate checkout (an agent
    // worktree, a vendored clone). Its manifests pin whatever version that tree
    // was cut at, which says nothing about THIS repo's conformance. Detecting the
    // .git marker covers every nesting convention rather than chasing directory
    // names as new ones appear.
    if (entry.isDirectory() && existsSync(join(path, '.git'))) continue;
    if (entry.isDirectory()) walk(path);
    else if (entry.name === 'package.json') packageManifests.push(path);
    else if (/\.(?:[cm]?[jt]sx?|css)$/.test(entry.name)) sourceFiles.push(path);
  }
}

// Paths quoted back to the user are part of this tool's output contract, so
// they stay POSIX-style on every platform. `relative` yields 'src\app.css' on
// Windows, which would make the same violation read differently per OS.
const relativePosix = (path) => relative(root, path).split(sep).join('/');

// A raw-text regex over the whole file would match the stylesheet path
// sitting inside a `//` or `/* */` comment, or an unrelated string literal
// that merely mentions it, and treat that as satisfying the import
// requirement. Strip comments (while preserving string contents, so the
// import check below still sees a genuine string) before testing so only
// real code can satisfy the gate.
function stripComments(text) {
  let out = '';
  for (let i = 0; i < text.length; ) {
    const two = text.slice(i, i + 2);
    if (two === '//') {
      const end = text.indexOf('\n', i);
      i = end === -1 ? text.length : end;
      continue;
    }
    if (two === '/*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 2;
      continue;
    }
    const ch = text[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      let j = i + 1;
      while (j < text.length && text[j] !== ch) {
        if (text[j] === '\\') j += 1;
        j += 1;
      }
      j = Math.min(j + 1, text.length);
      out += text.slice(i, j);
      i = j;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
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
    errors.push(`${relativePosix(path)}: pin @andrewpopov/admin-kit to v${packageVersion}.`);
  }
}
// Match on the basename rather than the full path. The previous regex
// anchored the segment boundary on a literal '/', but `join` emits '\' on
// Windows, so `src\main.tsx` never matched and every consumer on Windows was
// told to add a styles.css import it already had.
const entryFiles = files.filter(({ path }) => /^(?:main|layout)\.(?:[cm]?[jt]sx?)$/.test(basename(path)));
if (
  !entryFiles.some(({ text }) =>
    /['"]@andrewpopov\/admin-kit\/styles\.css['"]/.test(stripComments(text)),
  )
) {
  errors.push('Import @andrewpopov/admin-kit/styles.css from an application main or layout entry point.');
}
for (const { path, text } of files) {
  if (!/\.css$/.test(path)) continue;
  const rel = relativePosix(path);
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
