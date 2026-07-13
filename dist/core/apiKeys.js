"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineAdminApiKeysAdapter = defineAdminApiKeysAdapter;
exports.validateAdminApiKeys = validateAdminApiKeys;
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
        if (ids.has(key.id))
            throw new Error(`Duplicate API key ID: ${key.id}.`);
        ids.add(key.id);
    }
    return Object.freeze(keys.map((key) => Object.freeze({ ...key, scopes: Object.freeze([...key.scopes]) })));
}
