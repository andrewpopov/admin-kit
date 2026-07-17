import { type AdminApiKey } from "./apiKeys";
/** Aggregate posture facts derived from a set of API keys and their durable timestamps. */
export interface AdminApiKeysSummary {
    total: number;
    active: number;
    revoked: number;
    expired: number;
    unusedActive: number;
    activeKeys: readonly AdminApiKey[];
    unusedActiveKeys: readonly AdminApiKey[];
    mostRecentlyUsedKey?: AdminApiKey;
    hasRevoked: boolean;
}
/**
 * Summarizes a set of API keys by their resolved lifecycle state, not the raw
 * `state` field — a key may lag on being marked expired once its expiresAt
 * has simply passed, so counts must go through resolveAdminApiKeyState.
 */
export declare function summarizeAdminApiKeys(keys: readonly AdminApiKey[], now?: Date): AdminApiKeysSummary;
export type AdminApiKeysPostureKind = "no-active" | "unused-active" | "healthy";
export type AdminApiKeysPostureTone = "danger" | "warning" | "positive";
export interface AdminApiKeysPosture {
    kind: AdminApiKeysPostureKind;
    tone: AdminApiKeysPostureTone;
}
/**
 * Derives a posture kind/tone from a summary. Carries no copy — hosts own
 * the vocabulary shown to admins for each kind.
 */
export declare function deriveAdminApiKeysPosture(summary: AdminApiKeysSummary): AdminApiKeysPosture;
export type AdminApiKeyQueueItem = {
    kind: "create-first";
} | {
    kind: "review-unused";
    key: AdminApiKey;
} | {
    kind: "confirm-owner";
    key: AdminApiKey;
} | {
    kind: "audit-history";
};
/**
 * Derives an ordered follow-up queue from a summary: create a first key when
 * none is active, review the oldest unused active key, confirm ownership of
 * the most recently used key, then prompt an audit when revocations exist.
 */
export declare function deriveAdminApiKeysQueue(summary: AdminApiKeysSummary): readonly AdminApiKeyQueueItem[];
