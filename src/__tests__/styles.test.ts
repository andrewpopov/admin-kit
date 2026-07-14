import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync("src/styles.css", "utf8");

describe("Admin Kit styles", () => {
  it("provides dark defaults without requiring an optional host wrapper", () => {
    expect(styles).toContain(":root {");
    expect(styles).toContain(".dark {");
    expect(styles).toContain("--admin-kit-text: #f1f5f9;");
    expect(styles).toContain(".dark .admin-kit__secret");
  });
});
