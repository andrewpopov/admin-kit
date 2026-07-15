import type { ElementType, ReactNode } from "react";

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
export function AdminTheme({
  theme = "core",
  as = "div",
  className,
  children,
}: AdminThemeProps) {
  const Theme = as as ElementType;

  return (
    <Theme
      className={["admin-kit", `admin-kit--theme-${theme}`, className]
        .filter(Boolean)
        .join(" ")}
      data-admin-kit-theme={theme}
    >
      {children}
    </Theme>
  );
}
