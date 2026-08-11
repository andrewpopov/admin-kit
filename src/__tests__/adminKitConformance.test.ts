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
