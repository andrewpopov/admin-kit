import type { ReactNode } from "react";
import { type AdminPanelHeaderCollapsible } from "./AdminPanelHeader";
export interface AdminWorkspaceProps {
    /**
     * The landmark used for the workspace. Keep the default for a standalone
     * route; choose `section` when the host page already owns the only `main`.
     */
    as?: "main" | "section";
    title: string;
    /** Hide the visible title band when a nested panel already supplies the route heading. */
    showHeader?: boolean;
    /**
     * Let a data panel own the route header while the workspace keeps spacing
     * and landmarks without wrapping that header in another card.
     */
    presentation?: "framed" | "panel-led";
    description?: ReactNode;
    actions?: ReactNode;
    summary?: ReactNode;
    toolbar?: ReactNode;
    /** Renders the framed header as a collapsible panel header: `description`, `summary` and `toolbar` collapse; the title and `actions` do not. Ignored when the header is hidden or panel-led. */
    collapsible?: AdminPanelHeaderCollapsible;
    children: ReactNode;
    className?: string;
}
/** Standard semantic framing for dense administrative and operational views. */
export declare function AdminWorkspace({ as, title, showHeader, presentation, description, actions, summary, toolbar, collapsible, children, className, }: AdminWorkspaceProps): import("react").JSX.Element;
