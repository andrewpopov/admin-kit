import {
  validateAdminApiKeyCreated,
  validateAdminApiKeys,
  type AdminApiKey,
  type AdminApiKeyState,
  type AdminApiKeysAdapter,
} from "../core/apiKeys";

/**
 * Foreign contract — mirrors `api-access-kit`'s `ApiAccessCredential`
 * (src/index.ts). The secret hash and format/hash-version bookkeeping are
 * intentionally omitted: this bridge never needs them, and `ApiAccessCredential`
 * already keeps the raw secret out of this shape.
 */
export interface ForeignApiAccessCredential {
  id: string;
  scopes: readonly string[];
  createdAt: string;
  pepperVersion: string;
  expiresAt?: string;
  revokedAt?: string;
}

/** Foreign contract — mirrors `api-access-kit`'s `IssuedApiAccessCredential`. */
export interface ForeignIssuedApiAccessCredential<
  Credential extends ForeignApiAccessCredential,
> {
  credential: Credential;
  secret: string;
}

/**
 * Foreign contract — mirrors `api-access-kit`'s
 * `ApiAccessCredentialLifecycleStore` (create/replaceActive/revokeActive/
 * findById). `touchLastUsed` is not part of this bridge's surface.
 */
export interface ForeignApiAccessCredentialLifecycleStore<
  Credential extends ForeignApiAccessCredential,
> {
  findById(id: string): Promise<Credential | null>;
  create(credential: Credential): Promise<void>;
  replaceActive(input: {
    previousCredentialId: string;
    replacement: Credential;
    revokedAt: string;
  }): Promise<{ applied: true } | { applied: false; reason: string }>;
  revokeActive(input: {
    credentialId: string;
    revokedAt: string;
  }): Promise<{ applied: true } | { applied: false; reason: string }>;
}

/** Foreign contract — mirrors `api-access-kit`'s `ApiAccessPepper`. */
export interface ForeignApiAccessPepper {
  version: string;
  value: string;
}

export interface CreateApiKeysAdapterOptions<
  Credential extends ForeignApiAccessCredential,
  CreateInput = never,
> {
  store: ForeignApiAccessCredentialLifecycleStore<Credential>;
  /**
   * `api-access-kit` has no built-in "list all credentials" query — hosts
   * own that read. Wire this to whatever storage query enumerates the
   * owner/workspace's credentials.
   */
  listCredentials: () => readonly Credential[] | Promise<readonly Credential[]>;
  /**
   * Issues a brand-new credential. The host's own closure calls
   * `issueApiAccessCredential` (it owns the crypto and the pepper); this
   * bridge only persists the result and maps it for display.
   */
  issue: (input: CreateInput) => Promise<ForeignIssuedApiAccessCredential<Credential>>;
  /**
   * Issues fresh material for an active credential. The host's own closure
   * calls `issueReplacementApiAccessCredential`.
   */
  issueReplacement: (input: {
    credential: Credential;
  }) => Promise<ForeignIssuedApiAccessCredential<Credential>>;
  /** Must match the prefix the credentials were issued under. */
  prefix: string;
  /** The pepper ring, used to detect a credential signed under an unknown pepper. */
  peppers: readonly ForeignApiAccessPepper[];
  /** The backend has no `name` field; the host supplies display names. */
  nameOf: (credential: Credential) => string;
  now?: () => Date;
}

/**
 * Reimplements `api-access-kit`'s `formatApiAccessCredentialMask` — a pure,
 * dependency-free string format (`${prefix}${id}.…`) — so admin-kit needs no
 * runtime dependency on the backend to render it.
 */
function formatMask(prefix: string, credentialId: string): string {
  return `${prefix}${credentialId}.…`;
}

interface ResolvedState {
  state: AdminApiKeyState;
  detail?: string;
}

/**
 * Reimplements `api-access-kit`'s `getApiAccessCredentialStatus` lifecycle
 * rules, plus an unknown-pepper check equivalent to its
 * `UNKNOWN_PEPPER_VERSION` authentication failure. `EXPIRED`/`INVALID` both
 * fold to admin-kit's `expired`... except `INVALID` (an unparseable
 * `expiresAt`, or a pepper version admin-kit doesn't recognize) folds to
 * `revoked` instead: an invalid credential must never present as merely
 * time-expired, since expiry implies "was valid until recently."
 */
function resolveState(
  credential: ForeignApiAccessCredential,
  peppers: readonly ForeignApiAccessPepper[],
  now: Date,
): ResolvedState {
  if (credential.revokedAt) return { state: "revoked" };

  if (!peppers.some((pepper) => pepper.version === credential.pepperVersion)) {
    return { state: "revoked", detail: "Signed under an unrecognized pepper version." };
  }

  if (!credential.expiresAt) return { state: "active" };

  const expiresAtMs = new Date(credential.expiresAt).getTime();
  if (Number.isNaN(expiresAtMs)) {
    return { state: "revoked", detail: "Expiry timestamp is unparseable." };
  }

  return expiresAtMs <= now.getTime() ? { state: "expired" } : { state: "active" };
}

function mapCredential<Credential extends ForeignApiAccessCredential>(
  credential: Credential,
  options: Pick<CreateApiKeysAdapterOptions<Credential>, "prefix" | "peppers" | "nameOf" | "now">,
): AdminApiKey {
  const now = options.now?.() ?? new Date();
  const resolved = resolveState(credential, options.peppers, now);
  return {
    id: credential.id,
    name: options.nameOf(credential),
    maskedKey: formatMask(options.prefix, credential.id),
    state: resolved.state,
    scopes: credential.scopes,
    createdAt: credential.createdAt,
    expiresAt: credential.expiresAt,
    revokedAt: credential.revokedAt,
    details: resolved.detail ? [{ label: "Note", value: resolved.detail }] : undefined,
  };
}

/**
 * Builds an `AdminApiKeysAdapter` over an `api-access-kit`-shaped credential
 * store. The host supplies `issue`/`issueReplacement` closures that already
 * call the backend's crypto-bearing functions — this bridge only persists
 * the result via `store` and maps it for display.
 */
export function createApiKeysAdapter<
  Credential extends ForeignApiAccessCredential,
  CreateInput = never,
>(
  options: CreateApiKeysAdapterOptions<Credential, CreateInput>,
): AdminApiKeysAdapter<CreateInput> {
  const nowIso = () => (options.now?.() ?? new Date()).toISOString();

  return {
    async list() {
      const credentials = await options.listCredentials();
      return validateAdminApiKeys(
        credentials.map((credential) => mapCredential(credential, options)),
      );
    },

    async create(input: CreateInput) {
      const issued = await options.issue(input);
      await options.store.create(issued.credential);
      return validateAdminApiKeyCreated({
        key: mapCredential(issued.credential, options),
        secret: issued.secret,
      });
    },

    async revoke({ keyId }) {
      const result = await options.store.revokeActive({
        credentialId: keyId,
        revokedAt: nowIso(),
      });
      if (!result.applied) {
        throw new Error(`API credential revoke failed for ${keyId}: ${result.reason}`);
      }
    },

    async rotate({ keyId }) {
      const existing = await options.store.findById(keyId);
      if (!existing) throw new Error(`API credential not found: ${keyId}`);

      const issued = await options.issueReplacement({ credential: existing });
      const result = await options.store.replaceActive({
        previousCredentialId: keyId,
        replacement: issued.credential,
        revokedAt: nowIso(),
      });
      if (!result.applied) {
        throw new Error(`API credential rotation failed for ${keyId}: ${result.reason}`);
      }

      return validateAdminApiKeyCreated({
        key: mapCredential(issued.credential, options),
        secret: issued.secret,
      });
    },
  };
}
