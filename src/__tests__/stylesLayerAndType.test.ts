import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync("src/styles.css", "utf8");

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Top-level statements of a stylesheet: the text of each `a { … }` block or `@x …;` rule. */
function topLevelStatements(css: string): string[] {
  const statements: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < css.length; index += 1) {
    const char = css[index];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        statements.push(css.slice(start, index + 1).trim());
        start = index + 1;
      }
    } else if (char === ";" && depth === 0) {
      statements.push(css.slice(start, index + 1).trim());
      start = index + 1;
    }
  }
  const rest = css.slice(start).trim();
  if (rest) statements.push(rest);
  return statements;
}

function layerBody(statement: string): string {
  return statement.slice(statement.indexOf("{") + 1, statement.lastIndexOf("}"));
}

describe("styles.css cascade layer", () => {
  const statements = topLevelStatements(stripComments(stylesheet));

  it("keeps every rule inside a single `@layer admin-kit` block", () => {
    const outside = statements.filter((statement) => !/^@layer admin-kit\s*\{/.test(statement));
    expect(outside.map((statement) => statement.slice(0, 80))).toEqual([]);
    expect(statements).toHaveLength(1);
  });

  it("scopes every generic control rule (base, hover, disabled, font) to kit-owned controls", () => {
    const body = layerBody(statements[0]);
    const unscoped = [
      /\.admin-kit\s+:where\(\s*button\s*[,:)]/,
      /\.admin-kit\s+:where\(\s*button:(?:hover|disabled)/,
      /\.admin-kit\s+:where\(\s*(?:button|input|select)\s*,\s*(?:button|input|select)/,
      /\.admin-kit\s+:where\(\s*(?:input|select|textarea)\s*[,)]/,
    ];
    for (const pattern of unscoped) expect(body, String(pattern)).not.toMatch(pattern);
    for (const scoped of [
      '.admin-kit :where(button[class*="admin-kit__"]),',
      '.admin-kit :where(button[class*="admin-kit__"]:hover:not(:disabled)),',
      '.admin-kit :where(button[class*="admin-kit__"]:disabled),',
      '.admin-kit :where(button[class*="admin-kit__"], input[class*="admin-kit__"], select[class*="admin-kit__"]),',
    ]) {
      expect(body, scoped).toContain(scoped);
    }
  });
});

describe("styles.css type tokens", () => {
  const tokenBlock = stylesheet.match(/:root\s*{([^}]*)}/)?.[1] ?? "";
  const sizeTokens = ["page-title", "title", "body", "body-sm", "caption"];

  it("declares the public type tokens in the root token block", () => {
    const names = [
      "--admin-kit-font-family",
      ...sizeTokens.flatMap((role) => [
        `--admin-kit-text-${role}-size`,
        `--admin-kit-text-${role}-leading`,
      ]),
      "--admin-kit-weight-title",
      "--admin-kit-weight-strong",
      "--admin-kit-table-heading-transform",
      "--admin-kit-app-min-block-size",
    ];
    for (const name of names) expect(tokenBlock, name).toMatch(new RegExp(`${name}:\\s*[^;]+;`));
  });

  it("derives every font-size from a size token, with no literal rem, px or em length", () => {
    const literal = [...stylesheet.matchAll(/font-size:\s*([^;}]+)/g)]
      .map((match) => match[1].trim())
      .filter((value) => !value.includes("var(--admin-kit-text-") || /\d(?:rem|px|em)\b/.test(value));
    expect(literal).toEqual([]);
  });

  it("sets the .admin-kit font-size from the body token in its own rule", () => {
    const rule = stylesheet.match(/^\.admin-kit,\n[^{]*\{([^}]*)\}/m)?.[1] ?? "";
    expect(rule).toMatch(/font-size:\s*var\(--admin-kit-text-body-size\);/);
  });

  it("applies font: inherit to the key form's and field's bare controls", () => {
    expect(stylesheet).toMatch(
      /\.admin-kit__key-form :where\(input, select, textarea\),\n\.admin-kit__field :where\(input, select, textarea\) \{\n\s*font: inherit;/,
    );
  });
});
