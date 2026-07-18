import type { ReactNode } from "react";
export interface AdminWorkspaceProps {
    /**
     * The landmark used for the workspace. Keep the default for a standalone
     * route; choose `section` when the host page already owns the only `main`.
     */
    as?: "main" | "section";
    title: string;
    /** Hide the visible title band when a nested panel already supplies the route heading. */
    showHeader?: boolean;
    description?: ReactNode;
    actions?: ReactNode;
    summary?: ReactNode;
    toolbar?: ReactNode;
    children: ReactNode;
    className?: string;
}
/** Standard semantic framing for dense administrative and operational views. */
export declare function AdminWorkspace({ as, title, showHeader, description, actions, summary, toolbar, children, className }: AdminWorkspaceProps): import("react").JSX.Element;
