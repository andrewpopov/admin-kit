import type { ReactNode } from "react";
/**
 * `"section"` renders an `h2` title band; `"page"` renders an `h1` title band
 * for panel-led routes. `"none"` means the HOST owns the entire band — title,
 * actions AND toolbar — because `AdminPanelHeader` renders nothing at all.
 * A host that passes `actions` or `toolbar` alongside `presentation="none"`
 * will not see them: the band that would render them doesn't exist. The host
 * is responsible for rendering its own title, actions, and toolbar, and for
 * naming the panel's section (e.g. `aria-label={title}`) since no heading is
 * rendered.
 */
export type AdminPanelHeaderPresentation = "section" | "page" | "none";
export interface AdminPanelHeaderProps {
    title: string;
    presentation?: AdminPanelHeaderPresentation;
    detail?: ReactNode;
    actions?: ReactNode;
    /** Search, filters, and secondary controls grouped below the title band. */
    toolbar?: ReactNode;
    className?: string;
}
/**
 * One title/action band shared by standalone panels and panel-led pages.
 * Renders nothing when `presentation="none"` — see the contract documented
 * on {@link AdminPanelHeaderPresentation}.
 */
export declare function AdminPanelHeader({ title, presentation, detail, actions, toolbar, className, }: AdminPanelHeaderProps): import("react").JSX.Element | null;
