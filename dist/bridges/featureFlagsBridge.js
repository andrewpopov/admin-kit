"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFeatureFlagsAdapter = createFeatureFlagsAdapter;
const featureFlags_1 = require("../core/featureFlags");
const UNAVAILABLE_DETAIL = "The feature flag store is unavailable; showing last-known values.";
function mapSnapshot(snapshot, registry, mutationSeamProvided) {
    const registryByKey = new Map(registry.map((def) => [def.key, def]));
    const storeHealth = snapshot.health === "ok" ? "healthy" : "unavailable";
    const flags = snapshot.all().map((flag) => {
        const def = registryByKey.get(flag.key);
        return {
            key: flag.key,
            label: def?.label ?? flag.key,
            description: def?.description,
            enabled: flag.enabled,
            source: flag.source,
            // Only a store-backed flag can be toggled, and only when the host
            // actually wired a mutation seam — a read-only bridge never lies about
            // mutability. `updatedAt` is omitted: the backend records no such field.
            // Snapshot-level health also gates this: `AsyncFlags` keeps serving
            // last-known-good rows with `source: 'store'` while degraded, and a
            // write against an unavailable store cannot be trusted to land.
            mutable: flag.source === "store" && mutationSeamProvided && snapshot.health === "ok",
        };
    });
    return {
        flags,
        storeHealth,
        storeHealthDetail: storeHealth === "unavailable" ? UNAVAILABLE_DETAIL : undefined,
    };
}
/**
 * Builds an `AdminFeatureFlagsAdapter` over a `feature-flags-kit`-shaped
 * flags front end and registry. Consumers pass their real `SyncFlags`/
 * `AsyncFlags` object and registry in; no import of feature-flags-kit is
 * required by admin-kit itself.
 */
function createFeatureFlagsAdapter(options) {
    const { flags, registry, setEnabled } = options;
    const adapter = {
        async list() {
            const snapshot = await flags.loadSnapshot();
            return (0, featureFlags_1.validateAdminFeatureFlagsSnapshot)(mapSnapshot(snapshot, registry, Boolean(setEnabled)));
        },
    };
    if (setEnabled) {
        return {
            ...adapter,
            async setEnabled(input) {
                // Enforce the mutability contract list() reports: only store-sourced
                // flags on a healthy snapshot are writable; env/default-sourced
                // flags, and any flag read from a degraded (store-unavailable)
                // snapshot, must be rejected rather than forwarded to the host write
                // seam.
                const before = await flags.loadSnapshot();
                const current = before.all().find((flag) => flag.key === input.key);
                if (!current) {
                    throw new Error(`Unknown feature flag: ${input.key}`);
                }
                if (current.source !== 'store') {
                    throw new Error(`Feature flag ${input.key} is not mutable (source: ${current.source})`);
                }
                if (before.health !== 'ok') {
                    throw new Error(`Feature flag ${input.key} is not mutable (store health: ${before.health})`);
                }
                await setEnabled(input);
                // Re-evaluate rather than assume the write applied cleanly — a
                // store-error policy or env override could still shadow it.
                const snapshot = await flags.loadSnapshot();
                const mapped = mapSnapshot(snapshot, registry, true);
                const updated = mapped.flags.find((flag) => flag.key === input.key);
                if (!updated) {
                    throw new Error(`Unknown feature flag after update: ${input.key}`);
                }
                return updated;
            },
        };
    }
    return adapter;
}
