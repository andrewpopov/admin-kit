import type { ReactNode } from "react";
export interface AdminWorkspaceProps {
    title: string;
    description?: ReactNode;
    actions?: ReactNode;
    summary?: ReactNode;
    toolbar?: ReactNode;
    children: ReactNode;
    className?: string;
}
/** Standard semantic framing for dense administrative and operational views. */
export declare function AdminWorkspace({ title, description, actions, summary, toolbar, children, className }: AdminWorkspaceProps): import("react").JSX.Element;
