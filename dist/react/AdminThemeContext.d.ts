import { type ReactNode } from "react";
import type { AdminPaletteName, AdminThemeName } from "./AdminTheme";
/**
 * Lets portaled surfaces learn which theme boundary they were opened from.
 * An omitted palette inherits the surrounding one, so a nested Admin Kit
 * boundary never resets an opted-in palette back to the default.
 */
export declare function AdminThemeProvider({ theme, palette, children, }: {
    theme: AdminThemeName;
    palette?: AdminPaletteName;
    children: ReactNode;
}): import("react").JSX.Element;
/**
 * The palette class a theme boundary has to carry on its own element: CSS
 * inheritance covers nested boundaries, but a portal to `document.body`
 * escapes the subtree that declares the palette.
 */
export declare function useAdminPaletteClass(): string | null;
/**
 * Re-enters the surrounding theme for content portaled to `document.body`.
 * Hosts rebrand by overriding public tokens on `.admin-kit.admin-kit--theme-<name>`;
 * a portal escapes that wrapper, so it carries the same classes itself. Outside
 * any AdminTheme it renders its children untouched.
 */
export declare function AdminThemeLayer({ children }: {
    children: ReactNode;
}): import("react").JSX.Element;
