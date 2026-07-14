"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAdminApiKeyState = resolveAdminApiKeyState;
exports.defineAdminApiKeysAdapter = defineAdminApiKeysAdapter;
exports.validateAdminApiKeys = validateAdminApiKeys;
exports.validateAdminApiKeyCreated = validateAdminApiKeyCreated;
/**
 * Resolves the display and action state from durable lifecycle timestamps.
 * Revocation wins over expiry so a revoked credential never appears active
 * merely because its expiry is later removed or corrected.
 */
function resolveAdminApiKeyState(key, now = new Date()) {
    if (key.revokedAt || key.state === "revoked")
        return "revoked";
    if (key.expiresAt && new Date(key.expiresAt).getTime() <= now.getTime()) {
        return "expired";
    }
    return key.state === "expired" ? "expired" : "active";
}
function defineAdminApiKeysAdapter(adapter) {
    return Object.freeze({ ...adapter });
}
function validateAdminApiKeys(keys) {
    const ids = new Set();
    for (const key of keys) {
        if (!key.id.trim())
            throw new Error("API key IDs must not be empty.");
        if (!key.name.trim())
            throw new Error(`API key ${key.id} needs a name.`);
        if (!key.maskedKey.trim())
            throw new Error(`API key ${key.id} needs masked display material.`);
        if (!["active", "revoked", "expired"].includes(key.state)) {
            throw new Error(`API key ${key.id} has an invalid lifecycle state.`);
        }
        if (ids.has(key.id))
            throw new Error(`Duplicate API key ID: ${key.id}.`);
        ids.add(key.id);
    }
    return Object.freeze(keys.map((key) => Object.freeze({
        ...key,
        scopes: Object.freeze([...key.scopes]),
        details: key.details
            ? Object.freeze(key.details.map((detail) => Object.freeze({ ...detail })))
            : undefined,
    })));
}
/** Validates the only response shape that may carry a raw one-time secret. */
function validateAdminApiKeyCreated(created) {
    if (!created.secret.trim()) {
        throw new Error("A newly created API key must include a one-time secret.");
    }
    return Object.freeze({
        key: validateAdminApiKeys([created.key])[0],
        secret: created.secret,
    });
}
