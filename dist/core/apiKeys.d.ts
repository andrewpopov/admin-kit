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
    revoke: (input: {
        keyId: string;
    }) => Promise<void>;
    rotate?: (input: {
        keyId: string;
    }) => Promise<AdminApiKeyCreated>;
}
export declare function defineAdminApiKeysAdapter<CreateInput = never>(adapter: AdminApiKeysAdapter<CreateInput>): AdminApiKeysAdapter<CreateInput>;
export declare function validateAdminApiKeys(keys: readonly AdminApiKey[]): readonly AdminApiKey[];
/** Validates the only response shape that may carry a raw one-time secret. */
export declare function validateAdminApiKeyCreated(created: AdminApiKeyCreated): AdminApiKeyCreated;
