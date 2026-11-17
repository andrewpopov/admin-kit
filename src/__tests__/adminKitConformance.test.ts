import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const packageVersion = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"))
  .version as string;
const fixtureRoots: string[] = [];

function createConsumerFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "admin-kit-conformance-"));
  fixtureRoots.push(root);
  mkdirSync(join(root, "src", "app"), { recursive: true });
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      dependencies: {
        "@andrewpopov/admin-kit": `github:andrewpopov/admin-kit#v${packageVersion}`,
      },
    }),
  );
  writeFileSync(
    join(root, "src", "app", "layout.tsx"),
    'import "@andrewpopov/admin-kit/styles.css"; export default function Layout() { return null; }',
  );
  writeFileSync(join(root, "src", "layers.css"), "@layer theme, base, admin-kit, components, utilities;\n");
  return root;
}

/** Same as `createConsumerFixture`, minus the pre-seeded genuine stylesheet import. */
function createBareConsumerFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "admin-kit-conformance-"));
  fixtureRoots.push(root);
  mkdirSync(join(root, "src", "app"), { recursive: true });
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      dependencies: {
        "@andrewpopov/admin-kit": `github:andrewpopov/admin-kit#v${packageVersion}`,
      },
    }),
  );
  writeFileSync(join(root, "src", "layers.css"), "@layer theme, base, admin-kit, components, utilities;\n");
  return root;
}

function runConformance(root: string) {
  return spawnSync(
    process.execPath,
    [resolve(process.cwd(), "scripts", "admin-kit-conformance.mjs")],
    {
      cwd: root,
      encoding: "utf8",
    },
  );
}

afterEach(() => {
  for (const root of fixtureRoots.splice(0)) {
    rmSync(root, { force: true, recursive: true });
  }
});

describe("admin-kit-conformance", () => {
  function withSpec(spec: string): string {
    const root = createConsumerFixture();
    writeFileSync(join(root, "package.json"), JSON.stringify({ dependencies: { "@andrewpopov/admin-kit": spec } }));
    return root;
  }

  it("accepts an exact registry version pin (fleet npm registry, BRAIN-1006)", () => {
    const result = runConformance(withSpec(packageVersion));
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[admin-kit-conformance] PASS");
  });

  it("still accepts a github: pin at #v<version>", () => {
    expect(runConformance(withSpec(`github:andrewpopov/admin-kit#v${packageVersion}`)).status).toBe(0);
  });

  it("rejects a registry pin at another version, and a version that only shares a prefix", () => {
    for (const spec of ["0.0.1", `${packageVersion}0`, `^${packageVersion}`, `github:andrewpopov/admin-kit#v${packageVersion}0`]) {
      const result = runConformance(withSpec(spec));
      expect(result.status, spec).not.toBe(0);
      expect(result.stdout + result.stderr, spec).toContain("pin @andrewpopov/admin-kit to the exact version");
    }
  });

  it("ignores Next.js generated CSS after a consumer build", () => {
    const root = createConsumerFixture();
    const generated = join(root, ".next", "static", "css");
    mkdirSync(generated, { recursive: true });
    writeFileSync(join(generated, "app.css"), ":root { --admin-kit-accent: red; }");

    const result = runConformance(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[admin-kit-conformance] PASS");
  });

  // Canary for the conformance gate itself: build one fixture per case Codex
  // named (an under-matched first pass shipped once already) and assert the
  // verdict, so a future regression that starts pattern-matching text again
  // fails a test by name instead of silently reopening the bypass.
  it("rejects a bare string literal that merely contains the stylesheet path", () => {
    const root = createBareConsumerFixture();
    writeFileSync(
      join(root, "src", "app", "main.tsx"),
      'const documentation = "@andrewpopov/admin-kit/styles.css";\nexport default function Main() { return null; }',
    );

    const result = runConformance(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Import @andrewpopov/admin-kit/styles.css from an application main or layout entry point.",
    );
  });

  it("rejects a template literal containing import-looking text", () => {
    const root = createBareConsumerFixture();
    writeFileSync(
      join(root, "src", "app", "main.tsx"),
      'const example = `import "@andrewpopov/admin-kit/styles.css"`;\nexport default function Main() { return null; }',
    );

    const result = runConformance(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Import @andrewpopov/admin-kit/styles.css from an application main or layout entry point.",
    );
  });

  it("rejects an entry file whose only mention of the stylesheet import is inside a line comment", () => {
    const root = createBareConsumerFixture();
    writeFileSync(
      join(root, "src", "app", "main.tsx"),
      '// import "@andrewpopov/admin-kit/styles.css";\nexport default function Main() { return null; }',
    );

    const result = runConformance(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Import @andrewpopov/admin-kit/styles.css from an application main or layout entry point.",
    );
  });

  it("rejects an entry file whose only mention of the stylesheet import is inside a block comment", () => {
    const root = createBareConsumerFixture();
    writeFileSync(
      join(root, "src", "app", "main.tsx"),
      ["/*", ' * import "@andrewpopov/admin-kit/styles.css";', " */", "export default function Main() { return null; }"].join(
        "\n",
      ),
    );

    const result = runConformance(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Import @andrewpopov/admin-kit/styles.css from an application main or layout entry point.",
    );
  });

  it("rejects an entry file with no mention of the stylesheet at all", () => {
    const root = createBareConsumerFixture();
    writeFileSync(
      join(root, "src", "app", "main.tsx"),
      "export default function Main() { return null; }",
    );

    const result = runConformance(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Import @andrewpopov/admin-kit/styles.css from an application main or layout entry point.",
    );
  });

  it("still accepts a genuine stylesheet import", () => {
    const root = createBareConsumerFixture();
    writeFileSync(
      join(root, "src", "app", "main.tsx"),
      '// import "@andrewpopov/admin-kit/styles.css"; (a decoy comment, not the real import)\nimport "@andrewpopov/admin-kit/styles.css";\nexport default function Main() { return null; }',
    );

    const result = runConformance(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[admin-kit-conformance] PASS");
  });

  it("accepts a genuine require() call from a CommonJS entry point", () => {
    const root = createBareConsumerFixture();
    writeFileSync(
      join(root, "src", "app", "main.js"),
      'require("@andrewpopov/admin-kit/styles.css");\nmodule.exports = function Main() { return null; };',
    );

    const result = runConformance(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[admin-kit-conformance] PASS");
  });

  it("rejects a string that merely looks like a require() call", () => {
    const root = createBareConsumerFixture();
    writeFileSync(
      join(root, "src", "app", "main.js"),
      'const decoy = "require(\\"@andrewpopov/admin-kit/styles.css\\")";\nmodule.exports = function Main() { return null; };',
    );

    const result = runConformance(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Import @andrewpopov/admin-kit/styles.css from an application main or layout entry point.",
    );
  });

  it("does not let a quote inside a regex literal desynchronize comment detection", () => {
    const root = createBareConsumerFixture();
    writeFileSync(
      join(root, "src", "app", "main.tsx"),
      [
        'const pattern = /don\\u0027t match "quote"/;',
        '// import "@andrewpopov/admin-kit/styles.css";',
        "export default function Main() { return null; }",
      ].join("\n"),
    );

    const result = runConformance(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Import @andrewpopov/admin-kit/styles.css from an application main or layout entry point.",
    );
  });

  it("declares `typescript` as an OPTIONAL peer, never a runtime dependency — admin-kit ships with no runtime dependencies and must not drag the compiler into every consumer to support a CI-only gate", () => {
    const manifest = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as {
      dependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      peerDependenciesMeta?: Record<string, { optional?: boolean }>;
    };

    expect(manifest.dependencies).toBeUndefined();
    expect(manifest.peerDependencies?.typescript).toBeTruthy();
    expect(manifest.peerDependenciesMeta?.typescript?.optional).toBe(true);
  });

  it("FAILS CLOSED when `typescript` cannot be resolved, rather than skipping the check — a gate that reports success when it could not run is the same defect this file's stylesheet check just fixed", () => {
    const root = createConsumerFixture();
    // Resolution from the script's own location is what matters, so point the
    // whole process at a tree with no typescript rather than editing the fixture.
    const isolated = mkdtempSync(join(tmpdir(), "admin-kit-no-ts-"));
    const script = join(isolated, "admin-kit-conformance.mjs");
    writeFileSync(script, readFileSync(resolve(process.cwd(), "scripts/admin-kit-conformance.mjs"), "utf8"));

    const result = spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8" });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('"typescript" package could not be resolved');
  });

  it("still rejects a source-level internal token override", () => {
    const root = createConsumerFixture();
    writeFileSync(join(root, "src", "app.css"), ":root { --admin-kit-text: red; }");

    const result = runConformance(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "src/app.css: --admin-kit-text is an internal Admin Kit token and cannot be overridden",
    );
  });

  it("accepts a source-level public theme-token override", () => {
    const root = createConsumerFixture();
    writeFileSync(join(root, "src", "app.css"), ":root { --admin-kit-accent: red; }");

    const result = runConformance(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[admin-kit-conformance] PASS");
  });

  it("accepts a source-level public layout-token override", () => {
    const root = createConsumerFixture();
    writeFileSync(
      join(root, "src", "app.css"),
      ":root { --admin-kit-app-min-block-size: calc(100dvh - 45px); }",
    );

    const result = runConformance(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[admin-kit-conformance] PASS");
  });

  it("fails when no host stylesheet declares the admin-kit layer order", () => {
    const root = createConsumerFixture();
    rmSync(join(root, "src", "layers.css"));

    const result = runConformance(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Declare the Admin Kit cascade layer");
  });

  it("rejects an @layer statement that does not name admin-kit, or names it only in a comment", () => {
    const root = createConsumerFixture();
    writeFileSync(
      join(root, "src", "layers.css"),
      "/* @layer theme, base, admin-kit, utilities; */\n@layer theme, base, utilities;\n@layer base { .x { color: red } }\n",
    );

    const result = runConformance(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Declare the Admin Kit cascade layer");
  });

  it("passes with the layer order declared in a host stylesheet", () => {
    const result = runConformance(createConsumerFixture());

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[admin-kit-conformance] PASS");
  });

  it("accepts a source-level public type-token override", () => {
    const root = createConsumerFixture();
    writeFileSync(
      join(root, "src", "app.css"),
      [
        ":root {",
        "  --admin-kit-font-family: system-ui;",
        "  --admin-kit-text-page-title-size: 1.5rem;",
        "  --admin-kit-text-page-title-leading: 2rem;",
        "  --admin-kit-text-title-size: 1.125rem;",
        "  --admin-kit-text-body-size: 0.875rem;",
        "  --admin-kit-text-body-sm-size: 0.8125rem;",
        "  --admin-kit-text-caption-leading: 1rem;",
        "  --admin-kit-weight-title: 600;",
        "  --admin-kit-weight-strong: 500;",
        "  --admin-kit-table-heading-transform: uppercase;",
        "}",
      ].join("\n"),
    );

    const result = runConformance(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[admin-kit-conformance] PASS");
  });

  it("accepts a frameless AdminApp when host chrome supplies page identity", () => {
    const root = createConsumerFixture();
    writeFileSync(
      join(root, "src", "app", "main.tsx"),
      [
        'import { AdminApp } from "@andrewpopov/admin-kit";',
        "export default function Main() {",
        "  return (",
        "    <AdminApp>",
        '      <SomeChild frame={{ title: "not the AdminApp frame" }} />',
        "    </AdminApp>",
        "  );",
        "}",
      ].join("\n"),
    );

    const result = runConformance(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[admin-kit-conformance] PASS");
  });

  it("accepts a framed AdminApp", () => {
    const root = createConsumerFixture();
    writeFileSync(
      join(root, "src", "app", "main.tsx"),
      [
        'import { AdminApp } from "@andrewpopov/admin-kit";',
        "export default function Main() {",
        "  return (",
        '    <AdminApp frame={{ title: "Dashboard" }}>',
        "      <SomeChild />",
        "    </AdminApp>",
        "  );",
        "}",
      ].join("\n"),
    );

    const result = runConformance(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[admin-kit-conformance] PASS");
  });

  // The fixtures above build real paths with `join`, so they only exercise the
  // native separator: on Linux CI a '/'-anchored entry regex passes them while
  // every Windows consumer is told to add a styles.css import it already has.
  // Pin the separator-independent form so the regression cannot return on the
  // platform CI happens to run.
  it("detects entry files by basename, not a slash-anchored path regex", () => {
    const source = readFileSync(
      resolve(process.cwd(), "scripts", "admin-kit-conformance.mjs"),
      "utf8",
    );

    // Whole-file assertions, so reformatting or moving the check does not
    // break this: the slash-anchored form must be gone, and the entry test
    // must run through basename().
    expect(source).not.toMatch(/\(\?:\^\|\\\/\)\(\?:main\|layout\)/);
    expect(source).toMatch(/\/\^\(\?:main\|layout\)[^/]*\/\.test\(basename\(path\)\)/);
  });

  // Behavioural counterpart to the source assertion above: the classification
  // rule itself, applied to a path in each platform's native form. `join` in
  // the fixtures only ever produces the host separator, so without this a
  // Windows-only regression stays invisible on Linux CI.
  it.each([
    ["posix", "src/app/main.tsx", true],
    ["windows", "src\\app\\main.tsx", true],
    ["posix nested layout", "app/(marketing)/layout.jsx", true],
    ["windows nested layout", "app\\(marketing)\\layout.jsx", true],
    ["not an entry point", "src\\app\\mainish.tsx", false],
    ["different role", "src/app/page.tsx", false],
  ])("classifies a %s path correctly", (_label, input, expected) => {
    const isEntry = (p: string) =>
      /^(?:main|layout)\.(?:[cm]?[jt]sx?)$/.test(
        // basename() only splits on the host separator, so normalise first —
        // this mirrors what the CLI gets from its own platform's join().
        p.split(/[\\/]/).pop() ?? "",
      );

    expect(isEntry(input)).toBe(expected);
  });
});

describe("admin-kit-conformance theme contrast", () => {
  function runWithHostCss(css: string) {
    const root = createConsumerFixture();
    writeFileSync(join(root, "src", "theme.css"), css);
    return runConformance(root);
  }

  it("fails a pale accent with a white on-accent, naming the pair, ratio, threshold and file:line", () => {
    const result = runWithHostCss(
      ":root {\n  --admin-kit-accent: #ffd5b0;\n  --admin-kit-on-accent: #ffffff;\n}\n",
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("light accent/on-accent");
    expect(result.stderr).toContain("--admin-kit-accent #ffd5b0 (src/theme.css:2)");
    expect(result.stderr).toContain("--admin-kit-on-accent #ffffff (src/theme.css:3)");
    expect(result.stderr).toContain("below the required 4.5:1");
    expect(result.stderr).toContain("light accent/surface");
    expect(result.stderr).toContain("below the required 3:1");
  });

  it("falls back to the kit default on-accent when the host leaves it unset", () => {
    const result = runWithHostCss(":root { --admin-kit-accent: #ffd5b0; }");

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("--admin-kit-on-accent #ffffff (kit default)");
  });

  it("passes a compliant rebrand across light, .dark and auto scopes", () => {
    const result = runWithHostCss(`
      .admin-kit.admin-kit--theme-core { --admin-kit-accent: #4f46e5; --admin-kit-on-accent: #fff; }
      .dark .admin-kit.admin-kit--theme-core { --admin-kit-dark-accent: #a5b4fc; }
      @media (prefers-color-scheme: dark) {
        [data-admin-kit-theme="auto"] .admin-kit { --admin-kit-accent: #a5b4fc; }
      }
    `);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("[admin-kit-conformance] PASS");
  });

  it("fails a dark accent that is too dark against the dark surface", () => {
    const result = runWithHostCss(".dark { --admin-kit-dark-accent: #1f2a44; }");

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(".dark accent/surface");
    expect(result.stderr).toContain("--admin-kit-dark-accent #1f2a44 (src/theme.css:1)");
  });

  it("fails a bad auto-scope accent inside prefers-color-scheme", () => {
    const result = runWithHostCss(
      '@media (prefers-color-scheme: dark) {\n  [data-admin-kit-theme="auto"] { --admin-kit-accent: #10182b; }\n}',
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('data-admin-kit-theme="auto" accent/surface');
    expect(result.stderr).toContain("src/theme.css:2");
  });

  it.each([
    ["rgb", "rgb(255 213 176)"],
    ["rgba legacy", "rgba(255, 213, 176, 1)"],
    ["hsl", "hsl(28 100% 85%)"],
    ["oklch", "oklch(90% 0.07 60)"],
    ["color-mix in srgb", "color-mix(in srgb, #ffd5b0 50%, #ffffff)"],
    ["alpha over the surface", "#ff8c0020"],
  ])("resolves %s and fails the pale accent", (_label, value) => {
    const result = runWithHostCss(`:root { --admin-kit-accent: ${value}; }`);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("light accent/on-accent");
  });

  it.each([
    ["rgb", "rgb(49 86 199)"],
    ["hsl", "hsl(225 61% 47%)"],
    ["oklch", "oklch(0.48 0.17 265)"],
    ["color-mix in srgb", "color-mix(in srgb, #3156c7 80%, #000000)"],
  ])("passes a dark enough %s accent", (_label, value) => {
    const result = runWithHostCss(`:root { --admin-kit-accent: ${value}; }`);

    expect(result.status).toBe(0);
    expect(result.stderr).not.toContain("WARN");
  });

  it("warns and skips a value it cannot resolve instead of failing", () => {
    const result = runWithHostCss(":root { --admin-kit-accent: var(--brand-from-elsewhere); }");

    expect(result.status).toBe(0);
    expect(result.stderr).toContain("[admin-kit-conformance] WARN");
    expect(result.stderr).toContain("--admin-kit-accent: var(--brand-from-elsewhere) (src/theme.css:1)");
  });

  it("resolves a host variable reference and a var() fallback", () => {
    const result = runWithHostCss(
      ":root { --brand: #ffd5b0; --admin-kit-accent: var(--brand); --admin-kit-on-accent: var(--nope, #fff); }",
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("light accent/on-accent");
  });

  it("skips color-mix in a color space it cannot compute", () => {
    const result = runWithHostCss(":root { --admin-kit-accent: color-mix(in oklab, #ffd5b0, #fff); }");

    expect(result.status).toBe(0);
    expect(result.stderr).toContain("WARN");
  });
});
