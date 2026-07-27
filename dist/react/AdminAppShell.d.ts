import { type ReactNode } from "react";
import { type AdminThemeName } from "./AdminTheme";
import type { AdminAppFrame } from "./AdminApp";
export interface AdminAppShellNavigationContext {
    idPrefix: string;
    onNavigate?: () => void;
}
export interface AdminAppShellProps {
    /** Optional application-level framing; omit it when host chrome already supplies identity. */
    frame?: AdminAppFrame;
    /** Hosts render their route-aware navigation from their validated registry. */
    renderNavigation: (context: AdminAppShellNavigationContext) => ReactNode;
    children: ReactNode;
    ariaLabel?: string;
    mobileNavigationLabel?: string;
    /**
     * Set to `false` when the host already owns its own mobile navigation
     * chrome, so consumers don't end up with two competing hamburgers below
     * the mobile breakpoint. Defaults to `true` (shell renders its own toggle).
     */
    mobileNavigation?: boolean;
    theme?: AdminThemeName;
    className?: string;
}
/**
 * Responsive shell for URL-owning hosts. It deliberately accepts rendered
 * navigation rather than section content so frameworks retain route ownership.
 */
export declare function AdminAppShell({ frame, renderNavigation, children, ariaLabel, mobileNavigationLabel, mobileNavigation, theme, className, }: AdminAppShellProps): import("react").JSX.Element;
