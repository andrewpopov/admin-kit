import { describe, expect, it } from "vitest";
import {
  deriveAdminApiKeysPosture,
  deriveAdminApiKeysQueue,
  summarizeAdminApiKeys,
  type AdminApiKey,
} from "../core";

const base = {
  name: "Automation",
  maskedKey: "ak_…1234",
  scopes: ["read"] as const,
};

function key(overrides: Partial<AdminApiKey> & Pick<AdminApiKey, "id" | "state" | "createdAt">): AdminApiKey {
  return { ...base, ...overrides };
}

describe("summarizeAdminApiKeys", () => {
  it("summarizes an empty list", () => {
    const summary = summarizeAdminApiKeys([]);
    expect(summary.total).toBe(0);
    expect(summary.active).toBe(0);
    expect(summary.revoked).toBe(0);
    expect(summary.expired).toBe(0);
    expect(summary.unusedActive).toBe(0);
    expect(summary.activeKeys).toEqual([]);
    expect(summary.unusedActiveKeys).toEqual([]);
    expect(summary.mostRecentlyUsedKey).toBeUndefined();
    expect(summary.hasRevoked).toBe(false);
  });

  it("counts an all-revoked list", () => {
    const keys = [
      key({ id: "k1", state: "revoked", createdAt: "2026-01-01T00:00:00.000Z", revokedAt: "2026-01-02T00:00:00.000Z" }),
      key({ id: "k2", state: "revoked", createdAt: "2026-01-01T00:00:00.000Z", revokedAt: "2026-01-02T00:00:00.000Z" }),
    ];
    const summary = summarizeAdminApiKeys(keys);
    expect(summary.total).toBe(2);
    expect(summary.revoked).toBe(2);
    expect(summary.active).toBe(0);
    expect(summary.hasRevoked).toBe(true);
  });

  it("detects unused active keys (no lastUsedAt)", () => {
    const keys = [
      key({ id: "k1", state: "active", createdAt: "2026-01-01T00:00:00.000Z" }),
      key({ id: "k2", state: "active", createdAt: "2026-01-01T00:00:00.000Z", lastUsedAt: "2026-01-05T00:00:00.000Z" }),
    ];
    const summary = summarizeAdminApiKeys(keys);
    expect(summary.active).toBe(2);
    expect(summary.unusedActive).toBe(1);
    expect(summary.unusedActiveKeys.map((k) => k.id)).toEqual(["k1"]);
  });

  it("selects the most recently used key, ignoring unparseable/absent lastUsedAt", () => {
    const keys = [
      key({ id: "k1", state: "active", createdAt: "2026-01-01T00:00:00.000Z", lastUsedAt: "not-a-date" }),
      key({ id: "k2", state: "active", createdAt: "2026-01-01T00:00:00.000Z" }),
      key({ id: "k3", state: "active", createdAt: "2026-01-01T00:00:00.000Z", lastUsedAt: "2026-01-03T00:00:00.000Z" }),
      key({ id: "k4", state: "active", createdAt: "2026-01-01T00:00:00.000Z", lastUsedAt: "2026-01-05T00:00:00.000Z" }),
    ];
    const summary = summarizeAdminApiKeys(keys);
    expect(summary.mostRecentlyUsedKey?.id).toBe("k4");
  });

  it("has no mostRecentlyUsedKey when no active key has a parseable lastUsedAt", () => {
    const keys = [
      key({ id: "k1", state: "active", createdAt: "2026-01-01T00:00:00.000Z" }),
      key({ id: "k2", state: "active", createdAt: "2026-01-01T00:00:00.000Z", lastUsedAt: "garbage" }),
    ];
    const summary = summarizeAdminApiKeys(keys);
    expect(summary.mostRecentlyUsedKey).toBeUndefined();
  });

  it("classifies an unparseable lastUsedAt as unused: unknown usage must draw attention, not be trusted", () => {
    const keys = [
      key({ id: "k1", state: "active", createdAt: "2026-01-01T00:00:00.000Z", lastUsedAt: "not-a-date" }),
    ];
    const summary = summarizeAdminApiKeys(keys);
    expect(summary.unusedActive).toBe(1);
    expect(summary.unusedActiveKeys.map((k) => k.id)).toEqual(["k1"]);
  });

  it("resolves expiry via now: a key whose expiresAt passed counts as expired, not active", () => {
    const keys = [
      key({ id: "k1", state: "active", createdAt: "2026-01-01T00:00:00.000Z", expiresAt: "2026-06-01T00:00:00.000Z" }),
    ];
    const summary = summarizeAdminApiKeys(keys, new Date("2026-07-01T00:00:00.000Z"));
    expect(summary.expired).toBe(1);
    expect(summary.active).toBe(0);
  });

  it("freezes the summary and its array fields", () => {
    const keys = [key({ id: "k1", state: "active", createdAt: "2026-01-01T00:00:00.000Z" })];
    const summary = summarizeAdminApiKeys(keys);
    expect(Object.isFrozen(summary)).toBe(true);
    expect(Object.isFrozen(summary.activeKeys)).toBe(true);
    expect(Object.isFrozen(summary.unusedActiveKeys)).toBe(true);
  });
});

describe("deriveAdminApiKeysPosture", () => {
  it("is no-active/danger when there are no active keys", () => {
    const summary = summarizeAdminApiKeys([]);
    expect(deriveAdminApiKeysPosture(summary)).toEqual({ kind: "no-active", tone: "danger" });
  });

  it("is unused-active/warning when an active key has never been used", () => {
    const summary = summarizeAdminApiKeys([
      key({ id: "k1", state: "active", createdAt: "2026-01-01T00:00:00.000Z" }),
    ]);
    expect(deriveAdminApiKeysPosture(summary)).toEqual({ kind: "unused-active", tone: "warning" });
  });

  it("is healthy/positive when all active keys have been used", () => {
    const summary = summarizeAdminApiKeys([
      key({ id: "k1", state: "active", createdAt: "2026-01-01T00:00:00.000Z", lastUsedAt: "2026-01-05T00:00:00.000Z" }),
    ]);
    expect(deriveAdminApiKeysPosture(summary)).toEqual({ kind: "healthy", tone: "positive" });
  });
});

describe("deriveAdminApiKeysQueue", () => {
  it("queues create-first when there are no active keys", () => {
    const summary = summarizeAdminApiKeys([]);
    expect(deriveAdminApiKeysQueue(summary)).toEqual([{ kind: "create-first" }]);
  });

  it("queues review-unused with the oldest unused active key by createdAt", () => {
    const keys = [
      key({ id: "k1", state: "active", createdAt: "2026-02-01T00:00:00.000Z" }),
      key({ id: "k2", state: "active", createdAt: "2026-01-01T00:00:00.000Z" }),
    ];
    const summary = summarizeAdminApiKeys(keys);
    const queue = deriveAdminApiKeysQueue(summary);
    const reviewItem = queue.find((item) => item.kind === "review-unused");
    expect(reviewItem?.kind === "review-unused" && reviewItem.key.id).toBe("k2");
  });

  it("queues confirm-owner with the most recently used key", () => {
    const keys = [
      key({ id: "k1", state: "active", createdAt: "2026-01-01T00:00:00.000Z", lastUsedAt: "2026-01-05T00:00:00.000Z" }),
    ];
    const summary = summarizeAdminApiKeys(keys);
    const queue = deriveAdminApiKeysQueue(summary);
    expect(queue).toContainEqual({ kind: "confirm-owner", key: summary.mostRecentlyUsedKey });
  });

  it("queues audit-history when there are revoked keys", () => {
    const keys = [
      key({ id: "k1", state: "active", createdAt: "2026-01-01T00:00:00.000Z", lastUsedAt: "2026-01-05T00:00:00.000Z" }),
      key({ id: "k2", state: "revoked", createdAt: "2026-01-01T00:00:00.000Z", revokedAt: "2026-01-02T00:00:00.000Z" }),
    ];
    const summary = summarizeAdminApiKeys(keys);
    expect(deriveAdminApiKeysQueue(summary)).toContainEqual({ kind: "audit-history" });
  });

  it("orders items: create-first, review-unused, confirm-owner, audit-history", () => {
    const keys = [
      key({ id: "k1", state: "active", createdAt: "2026-01-01T00:00:00.000Z" }),
      key({ id: "k2", state: "active", createdAt: "2026-01-01T00:00:00.000Z", lastUsedAt: "2026-01-05T00:00:00.000Z" }),
      key({ id: "k3", state: "revoked", createdAt: "2026-01-01T00:00:00.000Z", revokedAt: "2026-01-02T00:00:00.000Z" }),
    ];
    const summary = summarizeAdminApiKeys(keys);
    const queue = deriveAdminApiKeysQueue(summary);
    expect(queue.map((item) => item.kind)).toEqual(["review-unused", "confirm-owner", "audit-history"]);
  });

  it("is empty and frozen when there is nothing to surface", () => {
    const keys = [
      key({ id: "k1", state: "active", createdAt: "2026-01-01T00:00:00.000Z", lastUsedAt: "2026-01-05T00:00:00.000Z" }),
    ];
    const summary = summarizeAdminApiKeys(keys);
    const queue = deriveAdminApiKeysQueue(summary);
    expect(queue).toEqual([{ kind: "confirm-owner", key: summary.mostRecentlyUsedKey }]);
    expect(Object.isFrozen(queue)).toBe(true);
  });
});
