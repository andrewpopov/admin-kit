import type { ReactNode } from "react";
export type AdminThemeName = "core";
export interface AdminThemeProps {
    /** The named visual contract shared by every Admin Kit surface. */
    theme?: AdminThemeName;
    /**
     * Lets a standalone panel use the host's landmark while retaining the
     * Admin Kit visual boundary.
     */
    as?: "div" | "section" | "main";
    className?: string;
    children: ReactNode;
}
/** Applies the canonical Admin Kit visual system to a complete admin surface. */
export declare function AdminTheme({ theme, as, className, children, }: AdminThemeProps): import("react").JSX.Element;
