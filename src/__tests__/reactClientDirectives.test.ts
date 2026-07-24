import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// This guard exists because of a real regression (v0.33.1): AdminLabels.tsx
// called `createContext` at module scope with no `'use client'` directive.
// `src/react/index.ts` re-exports everything through one barrel, so any
// import from `@andrewpopov/admin-kit/react` dragged AdminLabels in, and a
// consumer's React Server Component build failed with
// `TypeError: (0 , e.createContext) is not a function` -- the "react-server"
// condition resolves `react` to a build that omits client-only hooks.
//
// The defect was never the one missing directive; it is that nothing
// verifies a *newly added* client module gets marked. This test is that
// verification, and it deliberately checks BUILT `dist/react/**/*.js`, not
// `src/react/**/*.tsx`: the directive has to survive TypeScript compilation
// to matter, since dist is the artifact consumers actually load. tsc (this
// package compiles to CommonJS) always emits its own `"use strict";` as the
// literal first line, so a real compiled file's directive prologue is
// legitimately two lines deep (`"use strict";` then `"use client";`) --
// verified against a real Next.js 16 production build (both the positive
// case and, with the second line stripped, a byte-for-byte reproduction of
// the original "Failed to collect configuration" error) that this two-line
// prologue is still recognized as a client boundary. Checking only line 1
// would false-negative every module this package ships.

const distReactDir = resolve(process.cwd(), "dist/react");

// Hooks that only work inside the client (or classic SSR) render tree --
// none of these exist on the "react-server" condition's build of `react`,
// so calling one at module scope or component scope, in a module without a
// leading 'use client' directive, reproduces this exact class of bug.
const CLIENT_ONLY_HOOK_NAMES = [
  "createContext",
  "useContext",
  "useState",
  "useEffect",
  "useLayoutEffect",
  "useRef",
  "useReducer",
  "useCallback",
  "useMemo",
  "useImperativeHandle",
  "useSyncExternalStore",
  "useTransition",
  "useDeferredValue",
  "useInsertionEffect",
  "useId",
  "useDebugValue",
] as const;

// Note: NOT `\bhookName\s*\(` -- tsc's CommonJS output calls imported hooks
// through the `(0, ns.hookName)(args)` interop idiom (to keep `this` loose),
// so the invocation's own "(" is separated from the identifier by a ")".
// Matching the bare, word-bounded identifier is what actually fires on real
// dist/ output; requiring a trailing "(" silently never matches anything.
const HOOK_CALL_RE = new RegExp(`\\b(?:${CLIENT_ONLY_HOOK_NAMES.join("|")})\\b`);

// Compiled JSX (`jsx(...)`/`jsxs(...)` calls) attaches event handlers as
// plain object properties, e.g. `onClick: onClick,`. Type-only prop
// declarations (`onClick: MouseEventHandler<...>`) never survive `tsc`'s
// emit, so any remaining `onClick:`-shaped token in dist/ reflects a real
// runtime wire-up that requires hydration, and therefore a client boundary.
const DOM_EVENT_HANDLER_RE =
  /\bon(?:Click|DoubleClick|Change|Input|Submit|Select|Key(?:Down|Up|Press)|(?:Blur|Focus)|Mouse(?:Down|Up|Enter|Leave|Over|Out|Move)|Pointer(?:Down|Up|Move|Enter|Leave|Cancel)|Touch(?:Start|End|Move|Cancel)|Drag(?:Start|End|Enter|Leave|Over)?|Drop|Scroll|Wheel|Animation(?:Start|End|Iteration)|Transition(?:Start|End|Run|Cancel))\s*:/;

const ADD_EVENT_LISTENER_RE = /\.addEventListener\s*\(/;

function clientOnlyApiReason(source: string): string | null {
  const hookMatch = source.match(HOOK_CALL_RE);
  if (hookMatch) return `calls ${hookMatch[0]}(...)`;

  const handlerMatch = source.match(DOM_EVENT_HANDLER_RE);
  if (handlerMatch) return `attaches a DOM event handler (${handlerMatch[0].replace(/:$/, "")})`;

  if (ADD_EVENT_LISTENER_RE.test(source)) return "calls addEventListener(...)";

  return null;
}

// The ECMAScript "directive prologue" is a run of top-level
// ExpressionStatements that are bare string literals. Multiple directives
// can legally stack ("use strict"; "use client";), and tooling that detects
// 'use client' (Next.js/webpack/SWC) walks that whole run, not just line 1 --
// so this collects every leading directive rather than only checking the
// first line.
function leadingDirectives(source: string): string[] {
  const directives: string[] = [];
  for (const rawLine of source.split("\n")) {
    const line = rawLine.trim();
    if (line.length === 0) continue;
    const match = line.match(/^(['"])((?:(?!\1)[^\\]|\\.)*)\1;?$/);
    if (!match) break;
    directives.push(match[2]);
  }
  return directives;
}

function hasUseClientDirective(source: string): boolean {
  return leadingDirectives(source).includes("use client");
}

describe("dist/react 'use client' conformance", () => {
  it("finds a built dist/react to check", () => {
    // Deliberately NOT a skip: this suite verifies BUILT output, and a
    // missing dist/react means the check hasn't actually run at all. Silently
    // passing (or skipping) here is exactly how the original regression
    // shipped unnoticed -- fail loudly and name the fix.
    if (!existsSync(distReactDir)) {
      throw new Error(
        "dist/react does not exist. This suite checks BUILT dist/ output (the artifact " +
          "consumers actually load), not src/, because the 'use client' directive must " +
          "survive TypeScript compilation to matter. Run `npm run build` before `npm test` " +
          "-- the release battery (RELEASING.md / verify:dist-fresh) always builds first -- " +
          "then re-run this suite.",
      );
    }
    expect(existsSync(distReactDir)).toBe(true);
  });

  it("marks every dist/react module that uses a client-only React API with a leading 'use client' directive", () => {
    if (!existsSync(distReactDir)) {
      throw new Error("dist/react does not exist; see the preceding test for how to fix this.");
    }

    const files = readdirSync(distReactDir).filter((name) => name.endsWith(".js"));
    expect(files.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of files) {
      const source = readFileSync(join(distReactDir, file), "utf8");
      const reason = clientOnlyApiReason(source);
      if (reason && !hasUseClientDirective(source)) {
        offenders.push(`${file} -- ${reason} but has no leading 'use client' directive`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("does not mark purely presentational modules that use no client-only API", () => {
    // A canary against over-marking: if every module in the barrel gets
    // 'use client', a consumer's admin page can never be a Server Component.
    // AdminWorkspace is layout-only (an element-type switch and class-name
    // plumbing) -- it must stay server-renderable.
    const source = readFileSync(join(distReactDir, "AdminWorkspace.js"), "utf8");
    expect(clientOnlyApiReason(source)).toBeNull();
    expect(hasUseClientDirective(source)).toBe(false);
  });
});
