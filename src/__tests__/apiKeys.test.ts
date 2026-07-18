import { describe, expect, it } from "vitest";
import {
  resolveAdminApiKeyState,
  validateAdminApiKeyCreateRequest,
  validateAdminApiKeyScopeUpdate,
  validateAdminApiKeys,
} from "../core";

describe("resolveAdminApiKeyState", () => {
  it("resolves an unparseable expiresAt to revoked, never active", () => {
    expect(
      resolveAdminApiKeyState({ state: "active", expiresAt: "not-a-date" }),
    ).toBe("revoked");
  });

  it("still resolves revocation over a valid future expiry", () => {
    expect(
      resolveAdminApiKeyState({
        state: "active",
        expiresAt: "2099-01-01T00:00:00.000Z",
        revokedAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toBe("revoked");
  });

  it("resolves a valid past expiry to expired", () => {
    expect(
      resolveAdminApiKeyState({ state: "active", expiresAt: "2000-01-01T00:00:00.000Z" }),
    ).toBe("expired");
  });
});

describe("validateAdminApiKeys", () => {
  const base = {
    id: "key-1",
    name: "Automation",
    maskedKey: "ak_…1234",
    scopes: ["read"] as const,
    createdAt: "2026-01-01T00:00:00.000Z",
  };

  it("accepts a key whose state matches its lifecycle timestamps", () => {
    const validated = validateAdminApiKeys([{ ...base, state: "active" }]);
    expect(validated[0]?.state).toBe("active");
  });

  it("rejects a key with revokedAt set but state active", () => {
    expect(() =>
      validateAdminApiKeys([
        { ...base, state: "active", revokedAt: "2026-01-02T00:00:00.000Z" },
      ]),
    ).toThrow(/revokedAt.*not "revoked"/i);
  });

  it("rejects a key whose declared state disagrees with an unparseable expiresAt", () => {
    expect(() =>
      validateAdminApiKeys([{ ...base, state: "active", expiresAt: "garbage" }]),
    ).toThrow(/inconsistent with its lifecycle timestamps/i);
  });

  it("allows a key declared active whose expiresAt has already passed, deferring to derived state", () => {
    // A host may lag on persisting "expired" once expiresAt passes; the
    // panel derives the expired presentation via resolveAdminApiKeyState.
    // This is not the invalid case the fix targets.
    const validated = validateAdminApiKeys([
      { ...base, state: "active", expiresAt: "2000-01-01T00:00:00.000Z" },
    ]);
    expect(validated[0]?.state).toBe("active");
  });
});

describe("validateAdminApiKeyCreateRequest", () => {
  it("requires a non-empty name", () => {
    expect(() => validateAdminApiKeyCreateRequest({ name: "  ", scopes: [] })).toThrow(/needs a name/);
  });

  it("normalizes scopes: rejects blanks, dedupes, and preserves order", () => {
    expect(
      validateAdminApiKeyCreateRequest({ name: "CLI", scopes: ["b", "a", "b"] }).scopes,
    ).toEqual(["b", "a"]);
    expect(() =>
      validateAdminApiKeyCreateRequest({ name: "CLI", scopes: ["a", ""] }),
    ).toThrow(/non-empty scope strings/);
  });

  it("accepts undefined, null, and a positive integer expiry", () => {
    expect(validateAdminApiKeyCreateRequest({ name: "CLI", scopes: [] }).expiresInDays).toBeUndefined();
    expect(validateAdminApiKeyCreateRequest({ name: "CLI", scopes: [], expiresInDays: null }).expiresInDays).toBeNull();
    expect(validateAdminApiKeyCreateRequest({ name: "CLI", scopes: [], expiresInDays: 90 }).expiresInDays).toBe(90);
  });

  it("rejects 0, negatives, fractions, and NaN expiry", () => {
    for (const bad of [0, -1, 1.5, Number.NaN]) {
      expect(() =>
        validateAdminApiKeyCreateRequest({ name: "CLI", scopes: [], expiresInDays: bad }),
      ).toThrow(/positive whole number of days/);
    }
  });
});

describe("validateAdminApiKeyScopeUpdate", () => {
  it("normalizes scopes and rejects blank entries", () => {
    expect(validateAdminApiKeyScopeUpdate({ scopes: ["a", "a", "b"] }).scopes).toEqual(["a", "b"]);
    expect(() => validateAdminApiKeyScopeUpdate({ scopes: [" "] })).toThrow(/non-empty scope strings/);
  });
});
