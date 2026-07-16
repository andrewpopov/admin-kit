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
     * Reads the current snapshot. For `SyncFlags` pass `() => flags.snapshot()`;
     * for `AsyncFlags` pass `() => flags.loadSnapshot()` so every `list()` call
     * observes a fresh read rather than a stale cache.
     */
    flags: {
        snapshot(): ForeignFlagSnapshot | Promise<ForeignFlagSnapshot>;
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
