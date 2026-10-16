import type { ElementType, ReactNode } from "react";
import { AdminThemeProvider } from "./AdminThemeContext";

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
export function AdminTheme({
  theme = "core",
  palette,
  as = "div",
  className,
  children,
}: AdminThemeProps) {
  const Theme = as as ElementType;
  const paletteClass = palette && palette !== "core" ? `admin-kit--palette-${palette}` : null;

  return (
    <Theme
      className={["admin-kit", `admin-kit--theme-${theme}`, paletteClass, className]
        .filter(Boolean)
        .join(" ")}
      data-admin-kit-theme={theme}
    >
      <AdminThemeProvider theme={theme} palette={palette}>
        {children}
      </AdminThemeProvider>
    </Theme>
  );
}
