import {
  validateAdminFeatureFlagsSnapshot,
  type AdminFeatureFlag,
  type AdminFeatureFlagsAdapter,
  type AdminFeatureFlagsSnapshot,
  type FeatureFlagSource,
} from "../core/featureFlags";

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
  setEnabled?: (input: { key: string; enabled: boolean }) => void | Promise<void>;
}

const UNAVAILABLE_DETAIL =
  "The feature flag store is unavailable; showing last-known values.";

function mapSnapshot(
  snapshot: ForeignFlagSnapshot,
  registry: readonly ForeignFlagDefinition[],
  mutationSeamProvided: boolean,
): AdminFeatureFlagsSnapshot {
  const registryByKey = new Map(registry.map((def) => [def.key, def]));
  const storeHealth = snapshot.health === "ok" ? "healthy" : "unavailable";

  const flags: AdminFeatureFlag[] = snapshot.all().map((flag) => {
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
export function createFeatureFlagsAdapter(
  options: CreateFeatureFlagsAdapterOptions,
): AdminFeatureFlagsAdapter {
  const { flags, registry, setEnabled } = options;

  const adapter: AdminFeatureFlagsAdapter = {
    async list() {
      const snapshot = await flags.loadSnapshot();
      return validateAdminFeatureFlagsSnapshot(
        mapSnapshot(snapshot, registry, Boolean(setEnabled)),
      );
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
          throw new Error(
            `Feature flag ${input.key} is not mutable (source: ${current.source})`,
          );
        }
        if (before.health !== 'ok') {
          throw new Error(
            `Feature flag ${input.key} is not mutable (store health: ${before.health})`,
          );
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
