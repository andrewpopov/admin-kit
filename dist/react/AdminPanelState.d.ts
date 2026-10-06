import type { ReactNode } from "react";
export type AdminPanelState = {
    kind: "ready";
    children: ReactNode;
} | {
    kind: "loading";
    label?: string;
    /**
     * Render this many placeholder bars instead of bare text. The label stays
     * available to screen readers; omit it (or pass 0) for the plain label.
     */
    skeletonRows?: number;
} | {
    kind: "empty";
    title: string;
    detail?: string;
} | {
    kind: "error";
    title?: string;
    detail: string;
    onRetry?: () => void;
};
/** Accessible, framework-style-neutral state surface for adapter-backed panels. */
export declare function AdminPanelStateView({ state, className, }: {
    state: AdminPanelState;
    className?: string;
}): import("react").JSX.Element;
