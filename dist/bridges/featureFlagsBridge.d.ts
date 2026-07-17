import { type AdminFeatureFlagsAdapter, type FeatureFlagSource } from "../core/featureFlags";
/**
 * Foreign contract — mirrors `feature-flags-kit`'s `EvaluatedFlag`
 * (src/types.ts). admin-kit does not depend on feature-flags-kit; this shape
 * is structural so a real `EvaluatedFlag` satisfies it without a cast.
 */
export interface ForeignEvaluatedFlag {
    key: string;
    enabled: boolean;
    source: FeatureFlagSource;
    health: "ok" | "store-unavailable";
}
/**
 * Foreign contract — mirrors `feature-flags-kit`'s `FlagSnapshot` (src/types.ts).
 * Only the members this bridge reads are declared.
 */
export interface ForeignFlagSnapshot {
    all(): ForeignEvaluatedFlag[];
    health: "ok" | "store-unavailable";
}
/**
 * Foreign contract — mirrors `feature-flags-kit`'s `FlagDefinition`
 * (src/types.ts). The backend registry has no `label` field, only
 * `description`; `label` here is accepted for hosts that layer one on, and
 * falls back to the flag's key when absent.
 */
export interface ForeignFlagDefinition {
    key: string;
    description?: string;
    label?: string;
}
export interface CreateFeatureFlagsAdapterOptions {
    /**
     * Reads a FRESH snapshot — never a cached one. For `SyncFlags` pass
     * `() => flags.snapshot()` (every call already re-evaluates); for
     * `AsyncFlags` pass `() => flags.loadSnapshot()`, NOT `() =>
     * flags.snapshot()` — the latter serves `AsyncFlags`'s cached
     * last-known-good snapshot, so both `list()` and the post-write re-read in
     * `setEnabled` would silently observe a stale value instead of the write
     * that was just made.
     */
    flags: {
        loadSnapshot(): ForeignFlagSnapshot | Promise<ForeignFlagSnapshot>;
    };
    registry: readonly ForeignFlagDefinition[];
    /**
     * The mutation seam. Wire this to `store.set` (or `flags.set`). Omitting it
     * makes every flag reported as non-mutable, regardless of source — admin-kit
     * never assumes a write path exists.
     */
    setEnabled?: (input: {
        key: string;
        enabled: boolean;
    }) => void | Promise<void>;
}
/**
 * Builds an `AdminFeatureFlagsAdapter` over a `feature-flags-kit`-shaped
 * flags front end and registry. Consumers pass their real `SyncFlags`/
 * `AsyncFlags` object and registry in; no import of feature-flags-kit is
 * required by admin-kit itself.
 */
export declare function createFeatureFlagsAdapter(options: CreateFeatureFlagsAdapterOptions): AdminFeatureFlagsAdapter;
