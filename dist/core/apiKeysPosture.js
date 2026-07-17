"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarizeAdminApiKeys = summarizeAdminApiKeys;
exports.deriveAdminApiKeysPosture = deriveAdminApiKeysPosture;
exports.deriveAdminApiKeysQueue = deriveAdminApiKeysQueue;
const apiKeys_1 = require("./apiKeys");
function parseTimeMs(value) {
    if (!value)
        return undefined;
    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? undefined : ms;
}
/**
 * Summarizes a set of API keys by their resolved lifecycle state, not the raw
 * `state` field — a key may lag on being marked expired once its expiresAt
 * has simply passed, so counts must go through resolveAdminApiKeyState.
 */
function summarizeAdminApiKeys(keys, now = new Date()) {
    let active = 0;
    let revoked = 0;
    let expired = 0;
    const activeKeys = [];
    const unusedActiveKeys = [];
    let mostRecentlyUsedKey;
    let mostRecentlyUsedMs = -Infinity;
    for (const key of keys) {
        const resolved = (0, apiKeys_1.resolveAdminApiKeyState)(key, now);
        if (resolved === "revoked") {
            revoked += 1;
            continue;
        }
        if (resolved === "expired") {
            expired += 1;
            continue;
        }
        active += 1;
        activeKeys.push(key);
        const lastUsedMs = parseTimeMs(key.lastUsedAt);
        if (lastUsedMs === undefined) {
            // Absent OR unparseable lastUsedAt both land here on purpose: an
            // unparseable timestamp means usage is unknown, and unknown must draw
            // admin attention rather than be trusted — the same conservative fold
            // as resolveAdminApiKeyState treating an unparseable expiresAt as
            // revoked. Invalid must never present as valid.
            unusedActiveKeys.push(key);
            continue;
        }
        if (lastUsedMs > mostRecentlyUsedMs) {
            mostRecentlyUsedMs = lastUsedMs;
            mostRecentlyUsedKey = key;
        }
    }
    return Object.freeze({
        total: keys.length,
        active,
        revoked,
        expired,
        unusedActive: unusedActiveKeys.length,
        activeKeys: Object.freeze(activeKeys),
        unusedActiveKeys: Object.freeze(unusedActiveKeys),
        mostRecentlyUsedKey,
        hasRevoked: revoked > 0,
    });
}
/**
 * Derives a posture kind/tone from a summary. Carries no copy — hosts own
 * the vocabulary shown to admins for each kind.
 */
function deriveAdminApiKeysPosture(summary) {
    if (summary.active === 0)
        return { kind: "no-active", tone: "danger" };
    if (summary.unusedActive > 0)
        return { kind: "unused-active", tone: "warning" };
    return { kind: "healthy", tone: "positive" };
}
/**
 * Derives an ordered follow-up queue from a summary: create a first key when
 * none is active, review the oldest unused active key, confirm ownership of
 * the most recently used key, then prompt an audit when revocations exist.
 */
function deriveAdminApiKeysQueue(summary) {
    const items = [];
    if (summary.active === 0) {
        items.push({ kind: "create-first" });
    }
    if (summary.unusedActiveKeys.length > 0) {
        const oldestUnused = summary.unusedActiveKeys.reduce((oldest, key) => new Date(key.createdAt).getTime() < new Date(oldest.createdAt).getTime() ? key : oldest);
        items.push({ kind: "review-unused", key: oldestUnused });
    }
    if (summary.mostRecentlyUsedKey) {
        items.push({ kind: "confirm-owner", key: summary.mostRecentlyUsedKey });
    }
    if (summary.hasRevoked) {
        items.push({ kind: "audit-history" });
    }
    return Object.freeze(items);
}
