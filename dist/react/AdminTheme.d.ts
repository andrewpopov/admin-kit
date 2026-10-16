import type { ReactNode } from "react";
export type AdminThemeName = "core";
/**
 * Opt-in color palettes layered on top of the core theme. A palette only
 * re-declares color tokens, so `theme` stays `"core"` (and so does
 * `data-admin-kit-theme`) for every palette.
 */
export type AdminPaletteName = "core" | "graphite";
export interface AdminThemeProps {
    /** The named visual contract shared by every Admin Kit surface. */
    theme?: AdminThemeName;
    /** Recolors the core theme; nested Admin Kit boundaries inherit the choice. */
    palette?: AdminPaletteName;
    /**
     * Lets a standalone panel use the host's landmark while retaining the
     * Admin Kit visual boundary.
     */
    as?: "div" | "section" | "main";
    className?: string;
    children: ReactNode;
}
/** Applies the canonical Admin Kit visual system to a complete admin surface. */
export declare function AdminTheme({ theme, palette, as, className, children, }: AdminThemeProps): import("react").JSX.Element;
