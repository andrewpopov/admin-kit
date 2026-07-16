import { type AdminApiKeysAdapter } from "../core/apiKeys";
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
export interface ForeignIssuedApiAccessCredential<Credential extends ForeignApiAccessCredential> {
    credential: Credential;
    secret: string;
}
/**
 * Foreign contract — mirrors `api-access-kit`'s
 * `ApiAccessCredentialLifecycleStore` (create/replaceActive/revokeActive/
 * findById). `touchLastUsed` is not part of this bridge's surface.
 */
export interface ForeignApiAccessCredentialLifecycleStore<Credential extends ForeignApiAccessCredential> {
    findById(id: string): Promise<Credential | null>;
    create(credential: Credential): Promise<void>;
    replaceActive(input: {
        previousCredentialId: string;
        replacement: Credential;
        revokedAt: string;
    }): Promise<{
        applied: true;
    } | {
        applied: false;
        reason: string;
    }>;
    revokeActive(input: {
        credentialId: string;
        revokedAt: string;
    }): Promise<{
        applied: true;
    } | {
        applied: false;
        reason: string;
    }>;
}
/** Foreign contract — mirrors `api-access-kit`'s `ApiAccessPepper`. */
export interface ForeignApiAccessPepper {
    version: string;
    value: string;
}
export interface CreateApiKeysAdapterOptions<Credential extends ForeignApiAccessCredential, CreateInput = never> {
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
 * Builds an `AdminApiKeysAdapter` over an `api-access-kit`-shaped credential
 * store. The host supplies `issue`/`issueReplacement` closures that already
 * call the backend's crypto-bearing functions — this bridge only persists
 * the result via `store` and maps it for display.
 */
export declare function createApiKeysAdapter<Credential extends ForeignApiAccessCredential, CreateInput = never>(options: CreateApiKeysAdapterOptions<Credential, CreateInput>): AdminApiKeysAdapter<CreateInput>;
