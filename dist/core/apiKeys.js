"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAdminApiKeyState = resolveAdminApiKeyState;
exports.defineAdminApiKeysAdapter = defineAdminApiKeysAdapter;
exports.validateAdminApiKeys = validateAdminApiKeys;
exports.validateAdminApiKeyCreated = validateAdminApiKeyCreated;
exports.validateAdminApiKeyCreateRequest = validateAdminApiKeyCreateRequest;
exports.validateAdminApiKeyScopeUpdate = validateAdminApiKeyScopeUpdate;
/**
 * Resolves the display and action state from durable lifecycle timestamps.
 * Revocation wins over expiry so a revoked credential never appears active
 * merely because its expiry is later removed or corrected.
 */
function resolveAdminApiKeyState(key, now = new Date()) {
    if (key.revokedAt || key.state === "revoked")
        return "revoked";
    if (key.expiresAt) {
        const expiresAtMs = new Date(key.expiresAt).getTime();
        // An unparseable expiresAt must never present as active: invalid must
        // never present as valid, matching the fold in apiKeysBridge.ts.
        if (Number.isNaN(expiresAtMs))
            return "revoked";
        if (expiresAtMs <= now.getTime())
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
        if (key.revokedAt && key.state !== "revoked") {
            throw new Error(`API key ${key.id} has a revokedAt but its state is not "revoked".`);
        }
        // A host may legitimately lag on marking a key "expired" once its
        // expiresAt has simply passed — the panel derives that presentation via
        // resolveAdminApiKeyState. But a resolved "revoked" (an unparseable
        // expiresAt, or an explicit revokedAt caught above) must never be
        // declared as anything other than "revoked": invalid must never present
        // as valid.
        if (resolveAdminApiKeyState(key) === "revoked" && key.state !== "revoked") {
            throw new Error(`API key ${key.id} has a state inconsistent with its lifecycle timestamps.`);
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
/**
 * Normalizes a scope selection for the built-in flows: every entry must be a
 * non-empty string, duplicates are dropped (order preserved), and the result
 * is frozen. Shared by the create and edit request validators.
 */
function validateAdminApiKeyScopes(scopes, context) {
    if (!Array.isArray(scopes)) {
        throw new Error(`${context} must be an array of scope strings.`);
    }
    const seen = new Set();
    const deduped = [];
    for (const scope of scopes) {
        if (typeof scope !== "string" || !scope.trim()) {
            throw new Error(`${context} must contain only non-empty scope strings.`);
        }
        if (!seen.has(scope)) {
            seen.add(scope);
            deduped.push(scope);
        }
    }
    return Object.freeze(deduped);
}
/** Validates the built-in create flow's request (non-empty name, clean scopes). */
function validateAdminApiKeyCreateRequest(request) {
    if (!request.name.trim()) {
        throw new Error("A new API key needs a name.");
    }
    const { expiresInDays } = request;
    // Documented contract: undefined/null (non-expiring) or a positive whole
    // number of days. Reject 0, negatives, fractions, NaN, and non-numbers so an
    // invalid expiry never reaches the host adapter.
    if (expiresInDays !== undefined &&
        expiresInDays !== null &&
        (typeof expiresInDays !== "number" ||
            !Number.isInteger(expiresInDays) ||
            expiresInDays <= 0)) {
        throw new Error("API key expiry must be a positive whole number of days, or null.");
    }
    return Object.freeze({
        name: request.name,
        expiresInDays: request.expiresInDays,
        scopes: validateAdminApiKeyScopes(request.scopes, "API key create request scopes"),
    });
}
/** Validates the built-in edit flow's scope-only update. */
function validateAdminApiKeyScopeUpdate(update) {
    return Object.freeze({
        scopes: validateAdminApiKeyScopes(update.scopes, "API key scope update scopes"),
    });
}
