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

  it("formats a date-only value as a calendar date without a timezone shift", () => {
    // Regression guard: `new Date("2026-01-01")` parses as UTC midnight, and
    // formatting it with dateStyle+timeStyle in a timezone west of UTC
    // renders "Dec 31, 2025" for local viewers — a whole day off. A
    // date-only value has no time component to begin with, so it must
    // render as the calendar date the host wrote, not shift by timezone.
    const formatted = formatAdminTimestamp("2026-01-01");
    expect(formatted).not.toContain("2025");
    expect(formatted).not.toMatch(/\d{1,2}:\d{2}/); // no time component
  });

  it("keeps full ISO timestamps rendering with both date and time", () => {
    const formatted = formatAdminTimestamp("2026-01-01T23:30:00.000Z");
    expect(formatted).toMatch(/\d{1,2}:\d{2}/);
  });

  it("rejects a date-only value with an impossible day instead of silently rolling it forward", () => {
    // Regression guard: `new Date(2026, 1, 31)` normalizes February 31 into
    // March 3 rather than producing an invalid date, so validity alone
    // would let malformed input pass through as a wrong-but-valid date.
    expect(formatAdminTimestamp("2026-02-31")).toBe("2026-02-31");
  });

  it("rejects a date-only value with month 00", () => {
    expect(formatAdminTimestamp("2026-00-15")).toBe("2026-00-15");
  });

  it("rejects a date-only value with month 13", () => {
    expect(formatAdminTimestamp("2026-13-15")).toBe("2026-13-15");
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
