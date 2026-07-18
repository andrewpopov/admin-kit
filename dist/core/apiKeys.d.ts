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
export declare function resolveAdminApiKeyState(key: Pick<AdminApiKey, "state" | "expiresAt" | "revokedAt">, now?: Date): AdminApiKeyState;
export interface AdminApiKeyDetail {
    label: string;
    value: string;
}
/** One selectable scope in a host-supplied credential vocabulary. */
export interface AdminScopeOption {
    value: string;
    label: string;
    description?: string;
}
/**
 * A host-defined group of related scopes, presented together by
 * `AdminScopePicker`. The kit never interprets scope strings; hosts own the
 * vocabulary and its enforcement.
 */
export interface AdminScopeGroup {
    id: string;
    label: string;
    description?: string;
    scopes: readonly AdminScopeOption[];
}
/**
 * The request the built-in create flow emits. Hosts that opt into the kit's
 * scope-aware create form receive this shape at `adapter.create`; hosts using
 * the generic render-prop escape hatch keep their own `CreateInput`.
 */
export interface AdminApiKeyCreateRequest {
    name: string;
    /** Positive day count, or `null`/omitted for a non-expiring credential. */
    expiresInDays?: number | null;
    scopes: readonly string[];
}
/** The request the built-in edit flow emits — scopes only, never a re-issue. */
export interface AdminApiKeyScopeUpdate {
    scopes: readonly string[];
}
/** The only boundary where a raw secret may enter the package. */
export interface AdminApiKeyCreated {
    key: AdminApiKey;
    secret: string;
}
export interface AdminApiKeysAdapter<CreateInput = never, UpdateInput = never> {
    list(): Promise<readonly AdminApiKey[]>;
    create: (input: CreateInput) => Promise<AdminApiKeyCreated>;
    revoke: (input: {
        keyId: string;
    }) => Promise<void>;
    rotate?: (input: {
        keyId: string;
    }) => Promise<AdminApiKeyCreated>;
    update?: (input: {
        keyId: string;
        update: UpdateInput;
    }) => Promise<AdminApiKey>;
}
export declare function defineAdminApiKeysAdapter<CreateInput = never, UpdateInput = never>(adapter: AdminApiKeysAdapter<CreateInput, UpdateInput>): AdminApiKeysAdapter<CreateInput, UpdateInput>;
export declare function validateAdminApiKeys(keys: readonly AdminApiKey[]): readonly AdminApiKey[];
/** Validates the only response shape that may carry a raw one-time secret. */
export declare function validateAdminApiKeyCreated(created: AdminApiKeyCreated): AdminApiKeyCreated;
/** Validates the built-in create flow's request (non-empty name, clean scopes). */
export declare function validateAdminApiKeyCreateRequest(request: AdminApiKeyCreateRequest): AdminApiKeyCreateRequest;
/** Validates the built-in edit flow's scope-only update. */
export declare function validateAdminApiKeyScopeUpdate(update: AdminApiKeyScopeUpdate): AdminApiKeyScopeUpdate;
