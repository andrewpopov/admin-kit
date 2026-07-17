import { describe, expect, it } from "vitest";
import { validateAdminEventsPage } from "../core";

const baseEvent = {
  id: "event-1",
  occurredAt: "2026-07-13T00:00:00.000Z",
  category: "security",
  action: "SIGN_IN",
  message: "Sign-in succeeded",
  severity: "info" as const,
  outcome: "success" as const,
};

describe("validateAdminEventsPage", () => {
  it("accepts a page whose invariants and enums are all consistent", () => {
    const page = validateAdminEventsPage({
      items: [baseEvent],
      page: 1,
      pageSize: 25,
      total: 1,
    });
    expect(page.items[0]?.id).toBe("event-1");
  });

  it("rejects a total smaller than the returned items", () => {
    expect(() =>
      validateAdminEventsPage({ items: [baseEvent], page: 1, pageSize: 25, total: 0 }),
    ).toThrow(/total must be an integer at least as large/i);
  });

  it("rejects a page that returns more items than its page size", () => {
    expect(() =>
      validateAdminEventsPage({
        items: [baseEvent, { ...baseEvent, id: "event-2" }],
        page: 1,
        pageSize: 1,
        total: 2,
      }),
    ).toThrow(/cannot return more items than its page size/i);
  });

  it("rejects a non-positive page number or page size", () => {
    expect(() =>
      validateAdminEventsPage({ items: [], page: 0, pageSize: 25, total: 0 }),
    ).toThrow(/page number must be a positive integer/i);
    expect(() =>
      validateAdminEventsPage({ items: [], page: 1, pageSize: 0, total: 0 }),
    ).toThrow(/page size must be a positive integer/i);
  });

  it("rejects an event with an invalid severity", () => {
    expect(() =>
      validateAdminEventsPage({
        items: [{ ...baseEvent, severity: "critical" as never }],
        page: 1,
        pageSize: 25,
        total: 1,
      }),
    ).toThrow(/invalid severity/i);
  });

  it("rejects an event with an invalid outcome", () => {
    expect(() =>
      validateAdminEventsPage({
        items: [{ ...baseEvent, outcome: "pending" as never }],
        page: 1,
        pageSize: 25,
        total: 1,
      }),
    ).toThrow(/invalid outcome/i);
  });
});
