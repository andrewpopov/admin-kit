export type FeatureFlagSource = "store" | "environment" | "default" | "store-error-policy";
export type FeatureFlagStoreHealth = "healthy" | "degraded" | "unavailable";

export interface AdminFeatureFlag {
  key: string;
  label: string;
  description?: string;
  enabled: boolean;
  source: FeatureFlagSource;
  mutable: boolean;
  updatedAt?: string;
}

export interface AdminFeatureFlagsSnapshot {
  flags: readonly AdminFeatureFlag[];
  storeHealth: FeatureFlagStoreHealth;
  storeHealthDetail?: string;
}

export interface AdminFeatureFlagsAdapter {
  list(): Promise<AdminFeatureFlagsSnapshot>;
  setEnabled?: (input: { key: string; enabled: boolean }) => Promise<AdminFeatureFlag>;
}

const nonStoreSources = new Set<FeatureFlagSource>([
  "environment",
  "default",
  "store-error-policy",
]);

/** Defines a transport-neutral feature-flags adapter. */
export function defineAdminFeatureFlagsAdapter(
  adapter: AdminFeatureFlagsAdapter,
): AdminFeatureFlagsAdapter {
  return Object.freeze({ ...adapter });
}

/** Ensures the UI never presents an unsafe or misleading effective state. */
export function validateAdminFeatureFlagsSnapshot(
  snapshot: AdminFeatureFlagsSnapshot,
): AdminFeatureFlagsSnapshot {
  const keys = new Set<string>();
  for (const flag of snapshot.flags) {
    if (!flag.key.trim()) throw new Error("Feature flag keys must not be empty.");
    if (!flag.label.trim()) throw new Error(`Feature flag ${flag.key} needs a label.`);
    if (keys.has(flag.key)) throw new Error(`Duplicate feature flag key: ${flag.key}.`);
    if (nonStoreSources.has(flag.source) && flag.mutable) {
      throw new Error(
        `Feature flag ${flag.key} cannot be mutable while ${flag.source} controls it.`,
      );
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
