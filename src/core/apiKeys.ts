export type AdminApiKeyState = "active" | "revoked" | "expired";

/** List-safe metadata only. A raw secret is never part of this shape. */
export interface AdminApiKey {
  id: string;
  name: string;
  maskedKey: string;
  state: AdminApiKeyState;
  scopes: readonly string[];
  createdAt: string;
  expiresAt?: string;
  /** The durable time the credential was revoked, when the host retains it. */
  revokedAt?: string;
  lastUsedAt?: string;
  /** Safe policy or provenance facts supplied by the host. */
  details?: readonly AdminApiKeyDetail[];
}

/**
 * Resolves the display and action state from durable lifecycle timestamps.
 * Revocation wins over expiry so a revoked credential never appears active
 * merely because its expiry is later removed or corrected.
 */
export function resolveAdminApiKeyState(
  key: Pick<AdminApiKey, "state" | "expiresAt" | "revokedAt">,
  now = new Date(),
): AdminApiKeyState {
  if (key.revokedAt || key.state === "revoked") return "revoked";
  if (key.expiresAt && new Date(key.expiresAt).getTime() <= now.getTime()) {
    return "expired";
  }
  return key.state === "expired" ? "expired" : "active";
}

export interface AdminApiKeyDetail {
  label: string;
  value: string;
}

/** The only boundary where a raw secret may enter the package. */
export interface AdminApiKeyCreated {
  key: AdminApiKey;
  secret: string;
}

export interface AdminApiKeysAdapter<CreateInput = never, UpdateInput = never> {
  list(): Promise<readonly AdminApiKey[]>;
  create: (input: CreateInput) => Promise<AdminApiKeyCreated>;
  revoke: (input: { keyId: string }) => Promise<void>;
  rotate?: (input: { keyId: string }) => Promise<AdminApiKeyCreated>;
  update?: (input: { keyId: string; update: UpdateInput }) => Promise<AdminApiKey>;
}

export function defineAdminApiKeysAdapter<CreateInput = never, UpdateInput = never>(
  adapter: AdminApiKeysAdapter<CreateInput, UpdateInput>,
): AdminApiKeysAdapter<CreateInput, UpdateInput> {
  return Object.freeze({ ...adapter });
}

export function validateAdminApiKeys(
  keys: readonly AdminApiKey[],
): readonly AdminApiKey[] {
  const ids = new Set<string>();
  for (const key of keys) {
    if (!key.id.trim()) throw new Error("API key IDs must not be empty.");
    if (!key.name.trim()) throw new Error(`API key ${key.id} needs a name.`);
    if (!key.maskedKey.trim())
      throw new Error(`API key ${key.id} needs masked display material.`);
    if (!["active", "revoked", "expired"].includes(key.state)) {
      throw new Error(`API key ${key.id} has an invalid lifecycle state.`);
    }
    if (ids.has(key.id)) throw new Error(`Duplicate API key ID: ${key.id}.`);
    ids.add(key.id);
  }
  return Object.freeze(
    keys.map((key) =>
      Object.freeze({
        ...key,
        scopes: Object.freeze([...key.scopes]),
        details: key.details
          ? Object.freeze(key.details.map((detail) => Object.freeze({ ...detail })))
          : undefined,
      }),
    ),
  );
}

/** Validates the only response shape that may carry a raw one-time secret. */
export function validateAdminApiKeyCreated(
  created: AdminApiKeyCreated,
): AdminApiKeyCreated {
  if (!created.secret.trim()) {
    throw new Error("A newly created API key must include a one-time secret.");
  }

  return Object.freeze({
    key: validateAdminApiKeys([created.key])[0]!,
    secret: created.secret,
  });
}
