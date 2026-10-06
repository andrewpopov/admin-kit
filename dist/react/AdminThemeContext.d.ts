import { type ReactNode } from "react";
import type { AdminThemeName } from "./AdminTheme";
/** Lets portaled surfaces learn which theme boundary they were opened from. */
export declare function AdminThemeProvider({ theme, children, }: {
    theme: AdminThemeName;
    children: ReactNode;
}): import("react").JSX.Element;
/**
 * Re-enters the surrounding theme for content portaled to `document.body`.
 * Hosts rebrand by overriding public tokens on `.admin-kit.admin-kit--theme-<name>`;
 * a portal escapes that wrapper, so it carries the same classes itself. Outside
 * any AdminTheme it renders its children untouched.
 */
export declare function AdminThemeLayer({ children }: {
    children: ReactNode;
}): import("react").JSX.Element;
