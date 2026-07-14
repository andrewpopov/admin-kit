import { type AdminFeatureFlagsAdapter } from "../core";
export interface FeatureFlagsPanelProps {
    adapter: AdminFeatureFlagsAdapter;
    /** Optional host class for local styling without replacing the panel. */
    className?: string;
}
/** A source-aware flag panel that never offers a misleading mutable control. */
export declare function FeatureFlagsPanel({ adapter, className }: FeatureFlagsPanelProps): import("react").JSX.Element;
