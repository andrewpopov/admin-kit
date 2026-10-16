"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { AdminPaletteName, AdminThemeName } from "./AdminTheme";

const AdminThemeContext = createContext<AdminThemeName | undefined>(undefined);
const AdminPaletteContext = createContext<AdminPaletteName>("core");

/**
 * Lets portaled surfaces learn which theme boundary they were opened from.
 * An omitted palette inherits the surrounding one, so a nested Admin Kit
 * boundary never resets an opted-in palette back to the default.
 */
export function AdminThemeProvider({
  theme,
  palette,
  children,
}: {
  theme: AdminThemeName;
  palette?: AdminPaletteName;
  children: ReactNode;
}) {
  const inheritedPalette = useContext(AdminPaletteContext);

  return (
    <AdminThemeContext.Provider value={theme}>
      <AdminPaletteContext.Provider value={palette ?? inheritedPalette}>
        {children}
      </AdminPaletteContext.Provider>
    </AdminThemeContext.Provider>
  );
}

/**
 * The palette class a theme boundary has to carry on its own element: CSS
 * inheritance covers nested boundaries, but a portal to `document.body`
 * escapes the subtree that declares the palette.
 */
export function useAdminPaletteClass(): string | null {
  const palette = useContext(AdminPaletteContext);
  return palette === "core" ? null : `admin-kit--palette-${palette}`;
}

/**
 * Re-enters the surrounding theme for content portaled to `document.body`.
 * Hosts rebrand by overriding public tokens on `.admin-kit.admin-kit--theme-<name>`;
 * a portal escapes that wrapper, so it carries the same classes itself. Outside
 * any AdminTheme it renders its children untouched.
 */
export function AdminThemeLayer({ children }: { children: ReactNode }) {
  const theme = useContext(AdminThemeContext);
  const paletteClass = useAdminPaletteClass();
  if (!theme) return <>{children}</>;
  return (
    <div
      className={["admin-kit", `admin-kit--theme-${theme}`, paletteClass, "admin-kit--layer"]
        .filter(Boolean)
        .join(" ")}
      data-admin-kit-theme={theme}
    >
      {children}
    </div>
  );
}
