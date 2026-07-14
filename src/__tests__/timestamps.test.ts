import { describe, expect, it } from "vitest";
import { formatAdminTimestamp } from "../core";

describe("formatAdminTimestamp", () => {
  it("formats a parseable ISO-8601 value into a human-readable string", () => {
    const formatted = formatAdminTimestamp("2026-07-14T03:12:45.128Z");
    expect(formatted).not.toContain("T03:12:45.128Z");
    expect(formatted).not.toBe("2026-07-14T03:12:45.128Z");
  });

  it("passes non-parseable input through unchanged, byte-for-byte", () => {
    // Regression guard: hosts that pre-format their own values ("2 days ago",
    // "never") must never see "Invalid Date" rendered in their place.
    expect(formatAdminTimestamp("2 days ago")).toBe("2 days ago");
    expect(formatAdminTimestamp("never")).toBe("never");
    expect(formatAdminTimestamp("—")).toBe("—");
  });

  it("passes short non-ISO values through unchanged even though Date can parse them", () => {
    // Regression guard: `new Date("2")` is a VALID date (year 2001), so date
    // validity alone is not a safe passthrough gate. Only an actual
    // ISO-8601 shape should be auto-formatted.
    expect(formatAdminTimestamp("2")).toBe("2");
  });

  it("lets a host-supplied formatter fully override presentation", () => {
    const format = (iso: string) => `custom:${iso}`;
    expect(formatAdminTimestamp("2026-07-14T03:12:45.128Z", format)).toBe(
      "custom:2026-07-14T03:12:45.128Z",
    );
    // The override runs even for non-parseable input; it owns presentation.
    expect(formatAdminTimestamp("2 days ago", format)).toBe("custom:2 days ago");
  });
});
