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
    setEnabled?: (input: {
        key: string;
        enabled: boolean;
    }) => Promise<AdminFeatureFlag>;
}
/** Defines a transport-neutral feature-flags adapter. */
export declare function defineAdminFeatureFlagsAdapter(adapter: AdminFeatureFlagsAdapter): AdminFeatureFlagsAdapter;
/** Ensures the UI never presents an unsafe or misleading effective state. */
export declare function validateAdminFeatureFlagsSnapshot(snapshot: AdminFeatureFlagsSnapshot): AdminFeatureFlagsSnapshot;
