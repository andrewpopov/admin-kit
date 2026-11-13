import { type ReactNode } from "react";
import { type AdminBandDefault } from "./adminPanelBand";
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
/**
 * Marks that an application frame already renders the page's `h1`, so a
 * `presentation="page"` panel title becomes an `h2` (same look) and the page
 * keeps exactly one `h1`.
 */
export declare const AdminFrameHeadingProvider: import("react").Provider<boolean>;
export interface AdminPanelHeaderCollapsible {
    /** Names the page; the choice is stored per viewer under `admin-kit:header:<storageKey>:<regular|compact>`. */
    storageKey: string;
    /** Shown in the title row while the region is collapsed; carries applied-filter chips. */
    collapsedSummary: ReactNode;
    /** Applied filters; appended to the collapsed toggle's label. */
    activeCount?: number;
    /** `"auto"` collapses below 64rem wide or 45rem tall. */
    defaultCollapsed?: AdminBandDefault;
}
/** What a kit panel asks of its own header band; the panel supplies the summary content. */
export interface AdminPanelBandOptions<Context> {
    storageKey: string;
    defaultCollapsed?: AdminBandDefault;
    /** Applied filters the host owns, added to the panel's own count. */
    activeCount?: number;
    renderCollapsedSummary?: (context: Context) => ReactNode;
}
export declare function panelHeaderCollapsible<Context>(options: AdminPanelBandOptions<Context> | undefined, context: Context | undefined, own: {
    summary: ReactNode;
    activeCount?: number;
}): AdminPanelHeaderCollapsible | undefined;
/** Lets a control inside the collapsed summary hand focus back to the band's toggle after it acts. */
export declare function useAdminBandFocus(): () => void;
export interface AdminPanelHeaderProps {
    title: string;
    presentation?: AdminPanelHeaderPresentation;
    /** A description or count line; collapses with the region when `collapsible` is set. */
    detail?: ReactNode;
    /** Status tiles or a status line between `detail` and `toolbar`; collapses with the region. */
    summary?: ReactNode;
    actions?: ReactNode;
    /** Search, filters, and secondary controls grouped below the title band. */
    toolbar?: ReactNode;
    /** Adds a Hide/Show controls toggle that collapses `detail`, `summary` and `toolbar`. The title and `actions` never collapse. */
    collapsible?: AdminPanelHeaderCollapsible;
    className?: string;
}
/**
 * One title/action band shared by standalone panels and panel-led pages.
 * Renders nothing when `presentation="none"` — see the contract documented
 * on {@link AdminPanelHeaderPresentation}.
 */
export declare function AdminPanelHeader({ title, presentation, detail, summary, actions, toolbar, collapsible, className, }: AdminPanelHeaderProps): import("react").JSX.Element | null;
