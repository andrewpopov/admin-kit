import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync("src/styles.css", "utf8");

describe("Admin Kit styles", () => {
  it("provides dark defaults without requiring an optional host wrapper", () => {
    expect(styles).toContain(":root {");
    expect(styles).toContain(".dark {");
    expect(styles).toContain("--admin-kit-text: #f5f7fb;");
    expect(styles).toContain(".dark .admin-kit__secret");
  });

  it("provides a complete reusable visual system for admin panels", () => {
    expect(styles).toContain("--admin-kit-surface-subtle:");
    expect(styles).toContain("--admin-kit-accent-soft:");
    expect(styles).toContain(".admin-kit__dialog-actions button:last-child:not(.admin-kit__button--danger)");
    expect(styles).toContain(".admin-kit__keys > button");
    expect(styles).toContain(".admin-kit__user:hover");
  });
});
