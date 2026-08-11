#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';

// TypeScript is an OPTIONAL peer, not a dependency: admin-kit otherwise ships
// with zero runtime dependencies, and forcing the compiler on every consumer
// to support a gate most of them run only in CI would be a poor trade. Any
// consumer that can be checked at all authors the entry files this gate
// parses, so it already has typescript — but if it somehow does not, this
// FAILS CLOSED with an actionable message rather than skipping the check.
// A gate that quietly reports success when it could not run is the exact
// defect PKG-139 fixed in this file's stylesheet check.
let ts;
try {
  ({ default: ts } = await import('typescript'));
} catch {
  console.error(
    'admin-kit-conformance: cannot run — the "typescript" package could not be resolved.\n' +
      'This gate parses your entry files to verify real import declarations, which needs the\n' +
      'TypeScript parser. Install it as a dev dependency: npm i -D typescript',
  );
  process.exit(1);
}

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

const STYLESHEET_SPECIFIER = '@andrewpopov/admin-kit/styles.css';

function scriptKindFor(path) {
  if (/\.tsx$/.test(path)) return ts.ScriptKind.TSX;
  if (/\.jsx$/.test(path)) return ts.ScriptKind.JSX;
  if (/\.[cm]?ts$/.test(path)) return ts.ScriptKind.TS;
  return ts.ScriptKind.JS;
}

// A raw-text regex over the whole file — even with comments stripped — still
// matches the stylesheet path sitting inside an unrelated string or template
// literal ("this file documents ...", a decoy fixture, a code-sample
// string), which satisfies the text pattern without importing anything. Text
// matching cannot distinguish "the path appears somewhere in this file" from
// "this file imports the stylesheet". Parse the file and look for the one
// syntax shape that means the latter: a genuine `import` declaration whose
// module specifier is the stylesheet, or (this package ships CommonJS output
// under the `.js`/`.cjs` entry extensions the gate already accepts) a
// `require(...)` call naming it.
function fileImportsStylesheet(text, path) {
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, false, scriptKindFor(path));
  let found = false;
  function visit(node) {
    if (found) return;
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      if (node.moduleSpecifier.text === STYLESHEET_SPECIFIER) {
        found = true;
        return;
      }
    } else if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'require' &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      if (node.arguments[0].text === STYLESHEET_SPECIFIER) {
        found = true;
        return;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return found;
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
if (!entryFiles.some(({ path, text }) => fileImportsStylesheet(text, path))) {
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
