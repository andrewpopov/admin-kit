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
  lastUsedAt?: string;
}

/** The only boundary where a raw secret may enter the package. */
export interface AdminApiKeyCreated {
  key: AdminApiKey;
  secret: string;
}

export interface AdminApiKeysAdapter<CreateInput = never> {
  list(): Promise<readonly AdminApiKey[]>;
  create: (input: CreateInput) => Promise<AdminApiKeyCreated>;
  revoke: (input: { keyId: string }) => Promise<void>;
  rotate?: (input: { keyId: string }) => Promise<AdminApiKeyCreated>;
}

export function defineAdminApiKeysAdapter<CreateInput = never>(
  adapter: AdminApiKeysAdapter<CreateInput>,
): AdminApiKeysAdapter<CreateInput> {
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
    if (ids.has(key.id)) throw new Error(`Duplicate API key ID: ${key.id}.`);
    ids.add(key.id);
  }
  return Object.freeze(
    keys.map((key) =>
      Object.freeze({ ...key, scopes: Object.freeze([...key.scopes]) }),
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
