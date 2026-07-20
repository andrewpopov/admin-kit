import type { ReactNode } from "react";
export type AdminPanelHeaderPresentation = "section" | "page";
export interface AdminPanelHeaderProps {
    title: string;
    presentation?: AdminPanelHeaderPresentation;
    detail?: ReactNode;
    actions?: ReactNode;
    className?: string;
}
/** One title/action band shared by standalone panels and panel-led pages. */
export declare function AdminPanelHeader({ title, presentation, detail, actions, className, }: AdminPanelHeaderProps): import("react").JSX.Element;
