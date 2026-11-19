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
  'font-family',
  'text-page-title-size',
  'text-page-title-leading',
  'text-title-size',
  'text-title-leading',
  'text-body-size',
  'text-body-leading',
  'text-body-sm-size',
  'text-body-sm-leading',
  'text-caption-size',
  'text-caption-leading',
  'weight-title',
  'weight-strong',
  'table-heading-transform',
  'app-min-block-size',
  'muted',
  'dark-muted',
]);
// Private `.admin-kit__*` classes a host may target. Empty on purpose: every need has a public part, token or prop.
const PRIVATE_CLASS_ALLOWLIST = new Set([]);
const strict = process.argv.includes('--strict');
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

// ---- Contrast of the public rebrand tokens (PKG-370) ----
const CONTRAST_MINIMUMS = { accentOnAccent: 4.5, accentSurface: 3, textSurface: 4.5, mutedSurface: 4.5 };
const WARNINGS = [];
const CSS_NAMED_COLORS = { white: [1, 1, 1, 1], black: [0, 0, 0, 1], transparent: [0, 0, 0, 0] };

function maskComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));
}

// Flat CSS walker: every rule with its at-rule ancestors and its custom-property declarations (with line numbers).
function parseCustomPropertyRules(source) {
  const css = maskComments(source);
  const lineAt = (index) => css.slice(0, index).split('\n').length;
  const rules = [];
  const stack = [];
  let start = 0;
  let depth = 0;
  let quote = '';
  const takeDeclaration = (end) => {
    const top = stack[stack.length - 1];
    const text = css.slice(start, end);
    const colon = text.indexOf(':');
    if (!top || colon < 0) return;
    const name = text.slice(0, colon).trim();
    if (!name.startsWith('--')) return;
    const offset = start + text.length - text.trimStart().length;
    top.declarations.push({ name, value: text.slice(colon + 1).trim(), line: lineAt(offset) });
  };
  for (let i = 0; i < css.length; i += 1) {
    const ch = css[i];
    if (quote) {
      if (ch === quote && css[i - 1] !== '\\') quote = '';
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '(') depth += 1;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (depth === 0 && ch === '{') {
      stack.push({ prelude: css.slice(start, i).trim().replace(/\s+/g, ' '), declarations: [] });
      start = i + 1;
    } else if (depth === 0 && ch === ';') {
      takeDeclaration(i);
      start = i + 1;
    } else if (depth === 0 && ch === '}') {
      takeDeclaration(i);
      const closed = stack.pop();
      if (closed && !closed.prelude.startsWith('@')) {
        rules.push({
          selector: closed.prelude,
          darkMedia: stack.some((open) => /prefers-color-scheme\s*:\s*dark/.test(open.prelude)),
          declarations: closed.declarations,
        });
      }
      start = i + 1;
    }
  }
  return rules;
}

function splitTopLevel(text, separator) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const ch of text) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (depth === 0 && separator.test(ch)) {
      if (current.trim()) parts.push(current.trim());
      current = '';
    } else current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const encodeSrgb = (linear) => clamp01(linear <= 0.0031308 ? 12.92 * linear : 1.055 * Math.abs(linear) ** (1 / 2.4) - 0.055);

function channelValue(token, percentScale) {
  if (token === 'none') return 0;
  const number = Number.parseFloat(token);
  if (Number.isNaN(number)) return undefined;
  return token.endsWith('%') ? (number / 100) * percentScale : number;
}

function hueDegrees(token) {
  if (token === 'none') return 0;
  const number = Number.parseFloat(token);
  if (Number.isNaN(number)) return undefined;
  if (token.endsWith('turn')) return number * 360;
  if (token.endsWith('grad')) return number * 0.9;
  if (token.endsWith('rad')) return (number * 180) / Math.PI;
  return number;
}

function alphaOf(token) {
  if (token === undefined) return 1;
  const alpha = channelValue(token, 1);
  return alpha === undefined ? undefined : clamp01(alpha);
}

function functionArguments(body) {
  const slash = splitTopLevel(body, /\//);
  const channels = splitTopLevel(slash[0], /[\s,]/);
  const alpha = slash[1] ?? (channels.length === 4 ? channels[3] : undefined);
  return { channels: channels.slice(0, 3), alpha, count: channels.length };
}

function hslToRgb(hue, saturation, lightness) {
  const chroma = (n) => {
    const k = (n + hue / 30) % 12;
    return lightness - saturation * Math.min(lightness, 1 - lightness) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [chroma(0), chroma(8), chroma(4)];
}

function oklchToRgb(lightness, chroma, hue) {
  const a = chroma * Math.cos((hue * Math.PI) / 180);
  const b = chroma * Math.sin((hue * Math.PI) / 180);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    encodeSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    encodeSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    encodeSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

function mixSrgb(body) {
  const [space, ...inputs] = splitTopLevel(body, /,/);
  if (!/^in\s+srgb$/i.test(space ?? '') || inputs.length !== 2) return undefined;
  const parsed = inputs.map((input) => {
    const match = input.match(/^(?:(\d+(?:\.\d+)?)%\s+)?(.*?)(?:\s+(\d+(?:\.\d+)?)%)?$/);
    const color = parseColor(match[2]);
    const percent = match[1] ?? match[3];
    return color && { color, percent: percent === undefined ? undefined : Number(percent) };
  });
  if (parsed.some((entry) => !entry)) return undefined;
  let [first, second] = parsed.map((entry) => entry.percent);
  if (first === undefined && second === undefined) [first, second] = [50, 50];
  else if (first === undefined) first = 100 - second;
  else if (second === undefined) second = 100 - first;
  const total = first + second;
  if (total <= 0) return undefined;
  const weights = [first / total, second / total];
  const alpha = parsed[0].color[3] * weights[0] + parsed[1].color[3] * weights[1];
  if (alpha === 0) return [0, 0, 0, 0];
  const channel = (index) =>
    (parsed[0].color[index] * parsed[0].color[3] * weights[0] + parsed[1].color[index] * parsed[1].color[3] * weights[1]) / alpha;
  return [channel(0), channel(1), channel(2), alpha * Math.min(1, total / 100)];
}

// [r, g, b, a] in 0..1 sRGB, or undefined for anything not computable here.
function parseColor(raw) {
  const value = raw.trim().toLowerCase();
  if (CSS_NAMED_COLORS[value]) return CSS_NAMED_COLORS[value];
  const hex = value.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/);
  if (hex) {
    const digits = hex[1].length <= 4 ? [...hex[1]].map((digit) => digit + digit).join('') : hex[1];
    const byte = (index) => Number.parseInt(digits.slice(index * 2, index * 2 + 2), 16) / 255;
    return [byte(0), byte(1), byte(2), digits.length === 8 ? byte(3) : 1];
  }
  const call = value.match(/^([a-z-]+)\((.*)\)$/s);
  if (!call) return undefined;
  const [, name, body] = call;
  if (name === 'color-mix') return mixSrgb(body);
  const { channels, alpha, count } = functionArguments(body);
  const alphaValue = alphaOf(alpha);
  if (channels.length !== 3 || count > 4 || alphaValue === undefined) return undefined;
  let rgb;
  if (name === 'rgb' || name === 'rgba') {
    rgb = channels.map((token) => channelValue(token, 255) / 255);
  } else if (name === 'hsl' || name === 'hsla') {
    const hue = hueDegrees(channels[0]);
    const saturation = channelValue(channels[1], 1);
    const lightness = channelValue(channels[2], 1);
    if ([hue, saturation, lightness].includes(undefined)) return undefined;
    rgb = hslToRgb(((hue % 360) + 360) % 360, saturation, lightness);
  } else if (name === 'oklch') {
    const lightness = channelValue(channels[0], 1);
    const chroma = channelValue(channels[1], 0.4);
    const hue = hueDegrees(channels[2]);
    if ([lightness, chroma, hue].includes(undefined)) return undefined;
    rgb = oklchToRgb(lightness, chroma, hue);
  } else return undefined;
  return rgb.some((channel) => Number.isNaN(channel)) ? undefined : [...rgb.map(clamp01), alphaValue];
}

function compositeOver(foreground, background) {
  const alpha = foreground[3];
  return [0, 1, 2].map((index) => foreground[index] * alpha + background[index] * (1 - alpha));
}

function relativeLuminance([r, g, b]) {
  const linear = (channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function contrastRatio(foreground, background) {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

const SCOPE_TOKENS = {
  light: { accent: ['accent'], onAccent: ['on-accent'], surface: ['surface'], text: ['text'], muted: ['muted'] },
  dark: { accent: ['dark-accent', 'accent'], onAccent: ['on-accent'], surface: ['dark-surface', 'surface'], text: ['dark-text', 'text'], muted: ['dark-muted', 'muted'] },
  auto: { accent: ['dark-accent', 'accent'], onAccent: ['on-accent'], surface: ['dark-surface', 'surface'], text: ['dark-text', 'text'], muted: ['dark-muted', 'muted'] },
};
const KIT_DEFAULT_NAMES = {
  light: { accent: 'accent', onAccent: 'on-accent', surface: 'surface', text: 'text', muted: 'muted' },
  dark: { accent: 'dark-accent', onAccent: 'dark-on-accent', surface: 'dark-surface', text: 'dark-text', muted: 'dark-muted' },
};
KIT_DEFAULT_NAMES.auto = KIT_DEFAULT_NAMES.dark;
const SCOPE_LABELS = { light: 'light', dark: '.dark', auto: 'data-admin-kit-theme="auto"' };

function selectorScopes(selector, darkMedia) {
  return new Set(
    splitTopLevel(selector, /,/).map((rawPart) => {
      const part = rawPart.replace(/:not\([^)]*\)/g, '');
      if (/data-admin-kit-theme\s*=\s*["']?auto/.test(part)) return 'auto';
      if (/\.dark\b/.test(part)) return 'dark';
      return darkMedia ? 'auto' : 'light';
    }),
  );
}

function kitStylesheetPath() {
  return [new URL('./styles.css', import.meta.url), new URL('../src/styles.css', import.meta.url)].find((url) => existsSync(url));
}

function loadKitDefaults() {
  const path = kitStylesheetPath();
  if (!path) return undefined;
  const defaults = { light: new Map(), dark: new Map() };
  for (const rule of parseCustomPropertyRules(readFileSync(path, 'utf8'))) {
    const target = rule.selector === ':root' ? defaults.light : rule.selector === ':where(.dark, [data-admin-kit-theme="auto"])' ? defaults.dark : undefined;
    for (const { name, value } of target ? rule.declarations : []) target.set(name, value);
  }
  return defaults;
}

function collectHostDeclarations(cssFiles) {
  const declarations = [];
  for (const { path, text } of cssFiles) {
    for (const rule of parseCustomPropertyRules(text)) {
      const scopes = selectorScopes(rule.selector, rule.darkMedia);
      for (const { name, value, line } of rule.declarations) {
        declarations.push({ name: name.slice(2), value, scopes, location: `${relativePosix(path)}:${line}` });
      }
    }
  }
  return declarations;
}

function resolveHostValue(value, scope, declarations, depth = 0) {
  const variable = value.match(/^var\(\s*--([a-z0-9-]+)\s*(?:,\s*(.*))?\)$/is);
  if (!variable) return parseColor(value);
  const [, name, fallback] = variable;
  const declaredIn = (candidate) => declarations.findLast((declaration) => declaration.name === name && declaration.scopes.has(candidate));
  const referenced = declaredIn(scope) ?? declaredIn('light');
  if (referenced && depth < 5) return resolveHostValue(referenced.value, scope, declarations, depth + 1);
  return fallback !== undefined && depth < 5 ? resolveHostValue(fallback, scope, declarations, depth + 1) : undefined;
}

function resolveScopeColors(scope, declarations, kitDefaults) {
  const kit = kitDefaults[scope === 'light' ? 'light' : 'dark'];
  const colors = {};
  let hostDeclaresAccent = false;
  for (const role of Object.keys(SCOPE_TOKENS[scope])) {
    const names = SCOPE_TOKENS[scope][role];
    const winner = declarations.findLast(
      (declaration) =>
        names.some((name) => declaration.name === `admin-kit-${name}`) &&
        (declaration.scopes.has(scope) || (declaration.name.startsWith('admin-kit-dark-') && declaration.scopes.has('light'))),
    );
    if (winner && ['accent', 'onAccent', 'muted'].includes(role)) hostDeclaresAccent = true;
    const token = winner ? winner.name.replace(/^admin-kit-/, '') : KIT_DEFAULT_NAMES[scope][role];
    const raw = winner ? winner.value : kit.get(`--admin-kit-${token}`);
    const location = winner ? winner.location : 'kit default';
    const color = raw === undefined ? undefined : resolveHostValue(raw, scope, declarations);
    colors[role] = { token: `--admin-kit-${token}`, raw, location, color };
  }
  return hostDeclaresAccent ? colors : undefined;
}

function checkThemeContrast(cssFiles) {
  const kitDefaults = loadKitDefaults();
  if (!kitDefaults) return ['Cannot resolve the kit default colors: styles.css was not found next to this script.'];
  const declarations = collectHostDeclarations(cssFiles);
  const problems = [];
  for (const scope of ['light', 'dark', 'auto']) {
    const colors = resolveScopeColors(scope, declarations, kitDefaults);
    if (!colors) continue;
    const label = SCOPE_LABELS[scope];
    const describe = (entry) => `${entry.token}: ${entry.raw} (${entry.location})`;
    const unresolved = Object.values(colors).filter((entry) => !entry.color);
    for (const entry of unresolved) {
      WARNINGS.push(`${label}: cannot resolve ${describe(entry)}; skipping the contrast checks that use it.`);
    }
    const surface = colors.surface.color && compositeOver(colors.surface.color, [1, 1, 1]);
    const pairs = [
      ['accent', 'onAccent', 'accent/on-accent', CONTRAST_MINIMUMS.accentOnAccent],
      ['accent', 'surface', 'accent/surface', CONTRAST_MINIMUMS.accentSurface],
      ['text', 'surface', 'text/surface', CONTRAST_MINIMUMS.textSurface],
      ['muted', 'surface', 'muted/surface', CONTRAST_MINIMUMS.mutedSurface],
    ];
    for (const [foregroundRole, backgroundRole, name, minimum] of pairs) {
      const [foreground, background] = [colors[foregroundRole], colors[backgroundRole]];
      if (!foreground.color || !background.color || !surface) continue;
      const ground = foregroundRole === 'accent' && backgroundRole === 'onAccent' ? compositeOver(foreground.color, surface) : surface;
      const ink = foregroundRole === 'accent' && backgroundRole === 'onAccent' ? background.color : foreground.color;
      const ratio = contrastRatio(compositeOver(ink, ground), ground);
      if (ratio < minimum) {
        problems.push(
          `${label} ${name}: ${foreground.token} ${foreground.raw} (${foreground.location}) vs ${background.token} ${background.raw} (${background.location}) has contrast ${ratio.toFixed(2)}:1, below the required ${minimum}:1.`,
        );
      }
    }
  }
  return problems;
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
// An exact registry version (the fleet npm registry, BRAIN-1006) or a github: pin whose ref is this version.
function pinsThisVersion(specifier) {
  const spec = String(specifier).trim();
  if (spec === packageVersion) return true;
  const ref = spec.includes('#') ? spec.slice(spec.indexOf('#') + 1).replace(/^semver:/, '') : '';
  return ref === `v${packageVersion}` || ref === packageVersion;
}
for (const { path, specifier } of adminKitSpecs) {
  if (!pinsThisVersion(specifier)) {
    errors.push(`${relativePosix(path)}: pin @andrewpopov/admin-kit to the exact version ${packageVersion} (or a github: pin at #v${packageVersion}).`);
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
// styles.css lives in `@layer admin-kit`, and a layered rule loses to every
// unlayered host rule (a preflight reset, a global `button { background }`).
// A host that never declares the layer in an order statement renders the kit
// unstyled, so a pin bump in an unmigrated host must fail here.
const LAYER_ORDER_STATEMENT = /@layer\s+[^{};]*\badmin-kit\b[^{};]*;/;
const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
if (!files.some(({ path, text }) => /\.css$/.test(path) && LAYER_ORDER_STATEMENT.test(stripCssComments(text)))) {
  errors.push(
    'Declare the Admin Kit cascade layer in a host stylesheet that loads before the kit: for example `@layer theme, base, admin-kit, components, utilities;` placed before the Tailwind and @andrewpopov/admin-kit/styles.css imports, with any unlayered reset moved into a layer declared before admin-kit.',
  );
}
for (const { path, text } of files) {
  if (!/\.css$/.test(path)) continue;
  const rel = relativePosix(path);
  for (const match of text.matchAll(/--admin-kit-([a-z0-9-]+)\s*:/g)) {
    const name = match[1];
    if (!PUBLIC_THEME_TOKENS.has(name)) {
      errors.push(
        `${rel}: --admin-kit-${name} is an internal Admin Kit token and cannot be overridden; only the public theme, type and layout tokens may be set (accent, accent-strong, accent-soft, on-accent, radius, radius-sm, dark-accent, dark-accent-strong, dark-accent-soft, font-family, text-{page-title,title,body,body-sm,caption}-{size,leading}, weight-title, weight-strong, table-heading-transform, app-min-block-size, muted, dark-muted).`,
      );
    }
  }
}
// ---- Private class selectors in host CSS (PKG-372) ----
function findPrivateClassSelectors(cssFiles) {
  const found = [];
  for (const { path, text } of cssFiles) {
    const css = maskComments(text);
    let preludeStart = 0;
    let quote = '';
    for (let i = 0; i < css.length; i += 1) {
      const ch = css[i];
      if (quote) {
        if (ch === quote && css[i - 1] !== '\\') quote = '';
      } else if (ch === '"' || ch === "'") quote = ch;
      else if (ch === ';' || ch === '}') preludeStart = i + 1;
      else if (ch === '{') {
        const prelude = css.slice(preludeStart, i);
        if (!prelude.trimStart().startsWith('@')) {
          for (const match of prelude.matchAll(/\.(admin-kit__[\w-]+)|\[\s*class\s*[*^~|$]?=\s*["']?(admin-kit__[\w-]*)/g)) {
            const name = match[1] ?? match[2];
            if (PRIVATE_CLASS_ALLOWLIST.has(name)) continue;
            const line = css.slice(0, preludeStart + match.index).split('\n').length;
            found.push(`${relativePosix(path)}:${line}: host selector targets the private class .${name}; use a documented data-admin-kit-part, public token or prop (docs/styling-surface.md).`);
          }
        }
        preludeStart = i + 1;
      }
    }
  }
  return found;
}
const privateClassFindings = findPrivateClassSelectors(files.filter(({ path }) => /\.css$/.test(path)));
if (strict) errors.push(...privateClassFindings);
else for (const finding of privateClassFindings) WARNINGS.push(finding);
errors.push(...checkThemeContrast(files.filter(({ path }) => /\.css$/.test(path))));
for (const warning of WARNINGS) console.warn(`[admin-kit-conformance] WARN: ${warning}`);
if (errors.length) fail(errors);
console.log(`[admin-kit-conformance] PASS: ${files.length} source files satisfy the core admin contract.`);
