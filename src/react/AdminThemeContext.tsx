"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { AdminThemeName } from "./AdminTheme";

const AdminThemeContext = createContext<AdminThemeName | undefined>(undefined);

/** Lets portaled surfaces learn which theme boundary they were opened from. */
export function AdminThemeProvider({
  theme,
  children,
}: {
  theme: AdminThemeName;
  children: ReactNode;
}) {
  return <AdminThemeContext.Provider value={theme}>{children}</AdminThemeContext.Provider>;
}

/**
 * Re-enters the surrounding theme for content portaled to `document.body`.
 * Hosts rebrand by overriding public tokens on `.admin-kit.admin-kit--theme-<name>`;
 * a portal escapes that wrapper, so it carries the same classes itself. Outside
 * any AdminTheme it renders its children untouched.
 */
export function AdminThemeLayer({ children }: { children: ReactNode }) {
  const theme = useContext(AdminThemeContext);
  if (!theme) return <>{children}</>;
  return (
    <div
      className={`admin-kit admin-kit--theme-${theme} admin-kit--layer`}
      data-admin-kit-theme={theme}
    >
      {children}
    </div>
  );
}
