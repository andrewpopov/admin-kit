// Type-level contract for the scopeGroups discriminated union. The value of
// this test is the `tsc` typecheck (the @ts-expect-error below must fire);
// at runtime it only constructs React elements, so no DOM is needed.
import { describe, it } from "vitest";
import { ApiKeysPanel } from "../react";
import type {
  AdminApiKey,
  AdminApiKeyCreateRequest,
  AdminApiKeyCreated,
  AdminApiKeysAdapter,
  AdminApiKeyScopeUpdate,
} from "../core";

const sampleKey: AdminApiKey = {
  id: "k",
  name: "n",
  maskedKey: "ak_…",
  state: "active",
  scopes: [],
  createdAt: "2026-01-01T00:00:00.000Z",
};
const created: AdminApiKeyCreated = { key: sampleKey, secret: "s" };

// Correctly-shaped adapter for the built-in flows.
const builtInAdapter: AdminApiKeysAdapter<AdminApiKeyCreateRequest, AdminApiKeyScopeUpdate> = {
  list: async () => [],
  create: async () => created,
  revoke: async () => undefined,
  update: async () => sampleKey,
};

// An adapter whose create input is NOT the standard request shape.
const mismatchedAdapter: AdminApiKeysAdapter<{ foo: string }, AdminApiKeyScopeUpdate> = {
  list: async () => [],
  create: async () => created,
  revoke: async () => undefined,
};

describe("ApiKeysPanel scopeGroups type contract", () => {
  it("accepts a request-shaped adapter and rejects a mismatched one under scopeGroups", () => {
    // Compiles: scopeGroups pairs with the standard request-shaped adapter.
    void (<ApiKeysPanel scopeGroups={[]} adapter={builtInAdapter} />);
    // @ts-expect-error scopeGroups requires an AdminApiKeyCreateRequest adapter.
    void (<ApiKeysPanel scopeGroups={[]} adapter={mismatchedAdapter} />);
    // Legacy/generic mode (no scopeGroups) still accepts an arbitrary adapter.
    void (<ApiKeysPanel adapter={mismatchedAdapter} createInput={{ foo: "bar" }} />);
  });
});
