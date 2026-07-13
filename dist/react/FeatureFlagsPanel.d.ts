import { type AdminFeatureFlagsAdapter } from "../core";
export interface FeatureFlagsPanelProps {
    adapter: AdminFeatureFlagsAdapter;
}
/** A source-aware flag panel that never offers a misleading mutable control. */
export declare function FeatureFlagsPanel({ adapter }: FeatureFlagsPanelProps): import("react").JSX.Element;
