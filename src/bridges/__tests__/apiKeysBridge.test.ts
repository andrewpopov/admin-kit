import { describe, expect, it } from "vitest";
import { createApiKeysAdapter } from "../apiKeysBridge";
import type {
  ForeignApiAccessCredential,
  ForeignApiAccessCredentialLifecycleStore,
} from "../apiKeysBridge";

interface TestCredential extends ForeignApiAccessCredential {
  name: string;
}

function makeStore(
  initial: TestCredential[],
): ForeignApiAccessCredentialLifecycleStore<TestCredential> & {
  all: () => TestCredential[];
} {
  const rows = new Map(initial.map((c) => [c.id, c]));
  return {
    all: () => Array.from(rows.values()),
    async findById(id) {
      return rows.get(id) ?? null;
    },
    async create(credential) {
      rows.set(credential.id, credential);
    },
    async replaceActive({ previousCredentialId, replacement, revokedAt }) {
      const previous = rows.get(previousCredentialId);
      if (!previous) return { applied: false, reason: "NOT_FOUND" };
      rows.set(previousCredentialId, { ...previous, revokedAt });
      rows.set(replacement.id, replacement);
      return { applied: true };
    },
    async revokeActive({ credentialId, revokedAt }) {
      const existing = rows.get(credentialId);
      if (!existing) return { applied: false, reason: "NOT_FOUND" };
      rows.set(credentialId, { ...existing, revokedAt });
      return { applied: true };
    },
  };
}

const PEPPER = { version: "v1", value: "pepper-value" };
const NOW = new Date("2024-06-01T00:00:00.000Z");

function credential(overrides: Partial<TestCredential> = {}): TestCredential {
  return {
    id: "cred_1",
    name: "CI token",
    scopes: ["read"],
    createdAt: "2024-01-01T00:00:00.000Z",
    pepperVersion: PEPPER.version,
    ...overrides,
  };
}

describe("createApiKeysAdapter", () => {
  it("maps state: active, revoked, expired, and folds an unrecognized pepper to revoked", async () => {
    const store = makeStore([
      credential({ id: "active" }),
      credential({ id: "revoked", revokedAt: "2024-02-01T00:00:00.000Z" }),
      credential({ id: "expired", expiresAt: "2024-01-15T00:00:00.000Z" }),
      credential({ id: "unknown-pepper", pepperVersion: "unknown-version" }),
    ]);

    const adapter = createApiKeysAdapter({
      store,
      listCredentials: () => store.all(),
      issue: async () => {
        throw new Error("not used in this test");
      },
      issueReplacement: async () => {
        throw new Error("not used in this test");
      },
      prefix: "test_",
      peppers: [PEPPER],
      nameOf: (c) => c.name,
      now: () => NOW,
    });

    const keys = await adapter.list();
    const byId = new Map(keys.map((k) => [k.id, k]));
    expect(byId.get("active")!.state).toBe("active");
    expect(byId.get("revoked")!.state).toBe("revoked");
    expect(byId.get("expired")!.state).toBe("expired");
    expect(byId.get("unknown-pepper")!.state).toBe("revoked");
  });

  it("masks the key as prefix + id", async () => {
    const store = makeStore([credential({ id: "abc123" })]);
    const adapter = createApiKeysAdapter({
      store,
      listCredentials: () => store.all(),
      issue: async () => {
        throw new Error("unused");
      },
      issueReplacement: async () => {
        throw new Error("unused");
      },
      prefix: "kasa_",
      peppers: [PEPPER],
      nameOf: (c) => c.name,
      now: () => NOW,
    });

    const [key] = await adapter.list();
    expect(key!.maskedKey).toBe("kasa_abc123.…");
  });

  it("create() issues, persists via store.create, and returns {key, secret}", async () => {
    const store = makeStore([]);
    const issuedCredential = credential({ id: "new_1" });

    const adapter = createApiKeysAdapter({
      store,
      listCredentials: () => store.all(),
      issue: async () => ({ credential: issuedCredential, secret: "raw-secret-value" }),
      issueReplacement: async () => {
        throw new Error("unused");
      },
      prefix: "test_",
      peppers: [PEPPER],
      nameOf: (c) => c.name,
      now: () => NOW,
    });

    const created = await adapter.create(undefined as never);
    expect(created.secret).toBe("raw-secret-value");
    expect(created.key.id).toBe("new_1");
    expect(await store.findById("new_1")).toEqual(issuedCredential);
  });

  it("rotate() replaces the active credential and returns the new {key, secret}", async () => {
    const store = makeStore([credential({ id: "old_1" })]);
    const replacement = credential({ id: "new_1" });

    const adapter = createApiKeysAdapter({
      store,
      listCredentials: () => store.all(),
      issue: async () => {
        throw new Error("unused");
      },
      issueReplacement: async () => ({ credential: replacement, secret: "rotated-secret" }),
      prefix: "test_",
      peppers: [PEPPER],
      nameOf: (c) => c.name,
      now: () => NOW,
    });

    const rotated = await adapter.rotate!({ keyId: "old_1" });
    expect(rotated.key.id).toBe("new_1");
    expect(rotated.secret).toBe("rotated-secret");
    expect((await store.findById("old_1"))!.revokedAt).toBe(NOW.toISOString());
  });

  it("rotate() throws when the credential does not exist", async () => {
    const store = makeStore([]);
    const adapter = createApiKeysAdapter({
      store,
      listCredentials: () => store.all(),
      issue: async () => {
        throw new Error("unused");
      },
      issueReplacement: async () => {
        throw new Error("unused");
      },
      prefix: "test_",
      peppers: [PEPPER],
      nameOf: (c) => c.name,
      now: () => NOW,
    });

    await expect(adapter.rotate!({ keyId: "missing" })).rejects.toThrow(/not found/i);
  });

  it("revoke() calls store.revokeActive", async () => {
    const store = makeStore([credential({ id: "cred_1" })]);
    const adapter = createApiKeysAdapter({
      store,
      listCredentials: () => store.all(),
      issue: async () => {
        throw new Error("unused");
      },
      issueReplacement: async () => {
        throw new Error("unused");
      },
      prefix: "test_",
      peppers: [PEPPER],
      nameOf: (c) => c.name,
      now: () => NOW,
    });

    await adapter.revoke({ keyId: "cred_1" });
    expect((await store.findById("cred_1"))!.revokedAt).toBe(NOW.toISOString());
  });
});
