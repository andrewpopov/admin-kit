"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineAdminFeatureFlagsAdapter = defineAdminFeatureFlagsAdapter;
exports.validateAdminFeatureFlagsSnapshot = validateAdminFeatureFlagsSnapshot;
const nonStoreSources = new Set([
    "environment",
    "default",
    "store-error-policy",
]);
/** Defines a transport-neutral feature-flags adapter. */
function defineAdminFeatureFlagsAdapter(adapter) {
    return Object.freeze({ ...adapter });
}
/** Ensures the UI never presents an unsafe or misleading effective state. */
function validateAdminFeatureFlagsSnapshot(snapshot) {
    const keys = new Set();
    for (const flag of snapshot.flags) {
        if (!flag.key.trim())
            throw new Error("Feature flag keys must not be empty.");
        if (!flag.label.trim())
            throw new Error(`Feature flag ${flag.key} needs a label.`);
        if (keys.has(flag.key))
            throw new Error(`Duplicate feature flag key: ${flag.key}.`);
        if (nonStoreSources.has(flag.source) && flag.mutable) {
            throw new Error(`Feature flag ${flag.key} cannot be mutable while ${flag.source} controls it.`);
        }
        keys.add(flag.key);
    }
    if (snapshot.storeHealth === "healthy" && snapshot.storeHealthDetail) {
        throw new Error("A healthy feature flag store must not report a health detail.");
    }
    return Object.freeze({
        ...snapshot,
        flags: Object.freeze(snapshot.flags.map((flag) => Object.freeze({ ...flag }))),
    });
}
