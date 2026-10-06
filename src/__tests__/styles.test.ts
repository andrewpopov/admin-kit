import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync("src/styles.css", "utf8");

function extractToken(scope: "root" | "dark", name: string): string {
  // The dark values are declared once in the shared
  // `:where(.dark, [data-admin-kit-theme="auto"])` block; `.dark` itself
  // just aliases the public token names to those shared `--admin-kit-dark-*`
  // values. So resolving a dark-scope token means searching both blocks.
  const blockRes =
    scope === "root"
      ? [/:root\s*{([^}]*)}/]
      : [/\.dark\s*{([^}]*)}/, /:where\(\.dark,\s*\[data-admin-kit-theme="auto"\]\)\s*{([^}]*)}/];
  const tokenRe = new RegExp(`${name}:\\s*([^;]+);`);
  for (const re of blockRes) {
    const block = styles.match(re);
    if (!block) continue;
    const match = block[1].match(tokenRe);
    if (match) return match[1].trim();
  }
  throw new Error(`Could not find token ${name} in ${scope} scope`);
}

function resolveVar(value: string, scope: "root" | "dark"): string {
  const varMatch = value.match(/^var\((--[a-zA-Z0-9-]+)\)$/);
  if (!varMatch) return value;
  return resolveVar(extractToken(scope, varMatch[1]), scope);
}

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const num = parseInt(h, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const [R, G, B] = [channel(r), channel(g), channel(b)];
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexToRgb(hexA));
  const lumB = relativeLuminance(hexToRgb(hexB));
  const [lighter, darker] = lumA > lumB ? [lumA, lumB] : [lumB, lumA];
  return (lighter + 0.05) / (darker + 0.05);
}

function resolvedHex(name: string, scope: "root" | "dark"): string {
  return resolveVar(extractToken(scope, name), scope);
}

const AA_NORMAL_TEXT = 4.5;

describe("Admin Kit styles", () => {
  it("provides dark defaults without requiring an optional host wrapper", () => {
    expect(styles).toContain(":root {");
    expect(styles).toContain(".dark {");
    expect(styles).toContain("--admin-kit-dark-text: #f5f7fb;");
  });

  it("provides a complete reusable visual system for admin panels", () => {
    expect(styles).toContain(".admin-kit--theme-core {");
    expect(styles).toContain(".admin-kit__app-header");
    expect(styles).toContain(".admin-kit__card");
    expect(styles).toContain(".admin-kit__field");
    expect(styles).toContain(".admin-kit__dialog-header");
    expect(styles).toContain(".admin-kit__dialog-body");
    expect(styles).toContain("--admin-kit-surface-subtle:");
    expect(styles).toContain("--admin-kit-accent-soft:");
    expect(styles).toContain(
      ".admin-kit__dialog-actions button:last-child:not(.admin-kit__button--danger)",
    );
    expect(styles).toContain(".admin-kit__keys > button");
  });

  it("protects the shared responsive table and workspace contracts", () => {
    expect(styles).toContain(".admin-kit__workspace { box-sizing: border-box;");
    expect(styles).toContain(
      ".admin-kit__workspace-header { align-items: stretch; flex-direction: column; }",
    );
    expect(styles).toContain(".admin-kit__workspace-content--bare");
    expect(styles).toContain(".admin-kit__panel-header--page h1");
    expect(styles).toContain(".admin-kit__panel-header-actions");
    expect(styles).toContain(".admin-kit__button--primary");
    expect(styles).toContain(".admin-kit__table-wrap");
    expect(styles).toContain(".admin-kit__table th");
    expect(styles).toContain(".admin-kit__memberships-table");
    expect(styles).toContain(".admin-kit__logs-output");
    expect(styles).toContain(".admin-kit__sessions-table");
    expect(styles).toContain("overflow-x: auto");
  });

  it("hides low-priority table columns by CONTAINER width, not viewport width (PKG-62)", () => {
    // .admin-kit__table-wrap establishes the inline-size container so
    // priority hiding tracks the table's available space (e.g. a narrowed
    // sidebar layout), not the browser viewport.
    expect(styles).toContain("container-name: admin-kit-table;");
    expect(styles).toContain("container-type: inline-size;");
    // Assert the MECHANISM, not the tuned thresholds: both priority rules must
    // live inside an `admin-kit-table` container query. Pinning exact rem values
    // here made this test fail purely for being re-tuned (0.33.1), which guards
    // nothing — the contract is "container-based", the numbers are calibration.
    for (const priority of ["tertiary", "secondary"]) {
      const rule = `.admin-kit__users-table .admin-kit__table-cell--${priority} { display: none; }`;
      expect(styles).toContain(rule);
      const containerQuery = new RegExp(
        `@container admin-kit-table \\(max-width: [\\d.]+rem\\) \\{\\s*${rule.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
      );
      expect(styles).toMatch(containerQuery);
    }

    // The old viewport-media-query versions of these two priority rules must
    // be gone — only the @container versions above should hide these cells.
    const viewport48rem = styles.match(/@media \(max-width: 48rem\)\s*{([\s\S]*?)\n}/);
    expect(viewport48rem).not.toBeNull();
    expect(viewport48rem![1]).not.toContain("admin-kit__table-cell--tertiary");
    const viewport36rem = styles.match(/@media \(max-width: 36rem\)\s*{([\s\S]*?)\n}/);
    expect(viewport36rem).toBeNull();
  });

  it("turns backup rows into labeled cards without horizontal panning on mobile", () => {
    expect(styles).toContain(".admin-kit__backups-table-wrap { overflow-x: visible; }");
    expect(styles).toContain(".admin-kit__backups-table { display: block; min-width: 0; }");
    expect(styles).toContain(".admin-kit__backups-table .admin-kit__mobile-cell-label");
    expect(styles).toContain(
      ".admin-kit__backups-table td > button { justify-self: stretch; width: 100%; }",
    );
  });

  it("keeps shared form and action controls at the 44px mobile comfort target", () => {
    expect(styles).toContain(".admin-kit__button {");
    expect(styles).toMatch(/\.admin-kit__button \{[^}]*min-block-size: 2\.75rem;/);
    expect(styles).toMatch(/\.admin-kit__users-table select \{[^}]*min-block-size: 2\.75rem;/);
    expect(styles).toMatch(
      /\.admin-kit__logs-filters input, \.admin-kit__logs-filters select \{[^}]*min-block-size: 2\.75rem;/,
    );
    expect(styles).toMatch(/\.admin-kit__scope-group-toggle \{[^}]*min-block-size: 2\.75rem;/);
  });

  it("keeps routed portal navigation independently sized and sticky", () => {
    expect(styles).toContain("--admin-kit-sticky-top: 1rem;");
    expect(styles).toContain(".admin-kit__app-shell-navigation, .admin-kit__portal-navigation");
    expect(styles).toContain("align-self: start;");
    expect(styles).toContain("position: sticky;");
    expect(styles).toContain("max-height: calc(100dvh - (var(--admin-kit-sticky-top) * 2));");
    expect(styles).toContain(
      ".admin-kit__portal-navigation { border-radius: var(--admin-kit-radius-sm); max-height: none; overflow-y: visible; position: static; }",
    );
  });

  it("defines the foreground-on-fill and semantic tokens introduced in Stage 2", () => {
    expect(styles).toContain("--admin-kit-on-accent:");
    expect(styles).toContain("--admin-kit-on-danger:");
    expect(styles).toContain("--admin-kit-success:");
    expect(styles).toContain("--admin-kit-success-soft:");
    expect(styles).toContain("--admin-kit-warning:");
    expect(styles).toContain("--admin-kit-warning-soft:");
    expect(styles).toContain("--admin-kit-danger-strong:");
  });

  it("never falls back to !important anywhere in the stylesheet, outside the scoped reduced-motion override", () => {
    // The prefers-reduced-motion block below is a deliberate, narrowly
    // scoped exception: it must win over admin-kit's own transitions
    // regardless of their selector specificity (e.g. the higher-specificity
    // `[aria-busy="true"]` busy-dim rule), so it earns !important. No other
    // rule in the sheet gets that pass.
    const withoutReducedMotionBlock = styles.replace(
      /@media \(prefers-reduced-motion: reduce\)\s*{[\s\S]*?\n}/,
      "",
    );
    expect(withoutReducedMotionBlock).not.toContain("!important");
  });

  it("honors prefers-reduced-motion by neutralizing admin-kit's own transitions and animations", () => {
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("styles a running state pill (the contract allows completed | running | failed)", () => {
    expect(styles).toContain(".admin-kit__state-pill--running");
  });

  it("keeps the danger button interactive without !important, via an explicit hover rule", () => {
    expect(styles).toContain(".admin-kit__button--danger:hover:not(:disabled)");
  });

  it("removes the dead card CSS now that UsersPanel renders a table", () => {
    expect(styles).not.toContain(".admin-kit__user {");
    expect(styles).not.toContain(".admin-kit__users-list");
    // The inner wrapper divs UsersPanel still emits must remain styled.
    expect(styles).toContain(".admin-kit__user-identity");
    expect(styles).toContain(".admin-kit__user-controls");
  });

  it("makes the dark .admin-kit__secret override redundant (tokens carry the theme)", () => {
    expect(styles).not.toContain(".dark .admin-kit__secret");
  });

  it("keeps .dark authoritative and only opts a host into media-driven dark mode explicitly", () => {
    // Every `prefers-color-scheme: dark` block must be scoped to the opt-in
    // attribute selector — an unconditional block would flip a host whose
    // user explicitly chose light while their OS is set to dark.
    const mediaBlockRe = /@media \(prefers-color-scheme: dark\)\s*{([\s\S]*?)\n}/g;
    const matches = [...styles.matchAll(mediaBlockRe)];
    expect(matches.length).toBeGreaterThan(0);
    for (const match of matches) {
      expect(match[1]).toContain('[data-admin-kit-theme="auto"]');
    }
  });

  describe("WCAG AA contrast for foreground-on-fill tokens", () => {
    const cases: Array<{ fg: string; bg: string; label: string }> = [
      { fg: "--admin-kit-on-accent", bg: "--admin-kit-accent", label: "on-accent/accent" },
      {
        fg: "--admin-kit-on-accent",
        bg: "--admin-kit-accent-strong",
        label: "on-accent/accent-strong",
      },
      { fg: "--admin-kit-on-danger", bg: "--admin-kit-danger", label: "on-danger/danger" },
    ];

    for (const { fg, bg, label } of cases) {
      it(`${label} clears 4.5:1 in the light theme`, () => {
        const ratio = contrastRatio(resolvedHex(fg, "root"), resolvedHex(bg, "root"));
        expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
      });

      it(`${label} clears 4.5:1 in the dark theme`, () => {
        const ratio = contrastRatio(resolvedHex(fg, "dark"), resolvedHex(bg, "dark"));
        expect(ratio).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
      });
    }
  });
  it("uses one shared focus ring that covers links and paints the app canvas", () => {
    const ring = styles.match(/:focus-visible\s*{([^}]*)}/g) ?? [];
    const outlines = ring.filter((rule) => rule.includes("outline:"));
    expect(outlines).toHaveLength(1);
    expect(outlines[0]).toContain("outline: 2px solid var(--admin-kit-accent);");
    expect(outlines[0]).toContain("outline-offset: 2px;");
    expect(styles).toMatch(/\.admin-kit :where\(a, button, .*\):focus-visible/);
    expect(styles).toMatch(/\.admin-kit__app \{ background: var\(--admin-kit-surface\);/);
    expect(styles).toMatch(/\.admin-kit__app-shell \{ background: var\(--admin-kit-surface\);/);
  });
  describe("WCAG 1.4.11 non-text contrast for form control boundaries", () => {
    const THREE_TO_ONE = 3;
    for (const scope of ["root", "dark"] as const) {
      for (const surface of ["--admin-kit-surface", "--admin-kit-surface-subtle"]) {
        it(`--admin-kit-control-border clears 3:1 against ${surface} in the ${scope === "root" ? "light" : "dark"} theme`, () => {
          const ratio = contrastRatio(
            resolvedHex("--admin-kit-control-border", scope),
            resolvedHex(surface, scope),
          );
          expect(ratio).toBeGreaterThanOrEqual(THREE_TO_ONE);
        });
      }
    }

    it("is re-declared on the core theme boundary and uses a dedicated dark value", () => {
      expect(styles).toMatch(/\.admin-kit--theme-core \{[^}]*--admin-kit-control-border: #/);
      expect(styles).toMatch(/--admin-kit-dark-control-border: #/);
    });

    it("draws every text input, select and textarea border and the switch track from it", () => {
      const controlRules = styles
        .split("\n")
        .flatMap((line) => line.match(/[^{}]+\{[^}]*\}/g) ?? [])
        .filter((rule) => /\b(input|select|textarea)\b|switch-track/.test(rule.split("{")[0]))
        .filter((rule) =>
          /border:\s*1px solid|background: var\(--admin-kit-(border|control)/.test(rule),
        );
      expect(controlRules.length).toBeGreaterThanOrEqual(6);
      for (const rule of controlRules) {
        expect(rule, rule).not.toContain("--admin-kit-border-strong");
        expect(rule, rule).toContain("--admin-kit-control-border");
      }
    });
  });

  it("caps a dialog at the viewport and scrolls only its body, never stacking a bar over a focused field", () => {
    const dialog = styles.match(/\.admin-kit__dialog \{([^}]*)\}/)?.[1] ?? "";
    expect(dialog).toContain("max-block-size: calc(100vh - 2rem);");
    expect(dialog.indexOf("calc(100vh - 2rem)")).toBeLessThan(
      dialog.indexOf("calc(100dvh - 2rem)"),
    );
    expect(dialog).toContain("display: flex;");
    expect(dialog).toContain("flex-direction: column;");
    expect(dialog).toContain("overflow: hidden;");
    expect(dialog).toContain("box-sizing: border-box;");
    const body = styles.match(/\.admin-kit__dialog-body \{([^}]*)\}/)?.[1] ?? "";
    expect(body).toContain("overflow-y: auto;");
    expect(body).toContain("min-block-size: 0;");
    expect(body).toContain("overscroll-behavior: contain;");
    const header = styles.match(/\.admin-kit__dialog-header \{([^}]*)\}/)?.[1] ?? "";
    expect(header).not.toContain("sticky");
    expect(header).not.toMatch(/margin:\s*-/);
  });

  it("re-maps every dark token on a core boundary under an auto host, as it does under .dark", () => {
    const declarations = (block: string) =>
      [...block.matchAll(/(--admin-kit-[a-z-]+):\s*(var\(--admin-kit-dark-[a-z-]+\));/g)].map(
        (match) => `${match[1]}: ${match[2]}`,
      );
    const darkCore = styles.match(/\.dark \.admin-kit--theme-core \{([^}]*)\}/)?.[1] ?? "";
    const autoCore =
      styles.match(/\[data-admin-kit-theme="auto"\] \.admin-kit--theme-core \{([^}]*)\}/)?.[1] ??
      "";
    expect(declarations(darkCore).length).toBeGreaterThan(15);
    expect(declarations(autoCore).sort()).toEqual(declarations(darkCore).sort());
    expect(autoCore).toContain("--admin-kit-control-border: var(--admin-kit-dark-control-border);");
  });

  it("gives the dialog close button a 44px target", () => {
    const close = styles.match(/\.admin-kit__dialog-close \{([^}]*)\}/)?.[1] ?? "";
    expect(close).toContain("min-block-size: 2.75rem;");
    expect(close).toContain("min-inline-size: 2.75rem;");
  });

  it("neutralises layout and type on the portaled theme layer", () => {
    const layer = styles.match(/\.admin-kit--layer \{([^}]*)\}/)?.[1] ?? "";
    expect(layer).toContain("display: contents;");
    expect(layer).toContain("font: inherit;");
  });

  it("only animates the loading skeleton when motion is allowed", () => {
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion: no-preference\) \{\s*\.admin-kit__skeleton-bar \{[^}]*animation:/,
    );
    expect(styles.match(/^\.admin-kit__skeleton-bar \{[^}]*\}/m)?.[0]).not.toContain("animation");
  });
});
