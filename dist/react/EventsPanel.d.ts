import { type ReactNode } from "react";
import { type AdminEventsAdapter, type AdminEventsQuery } from "../core";
import { type AdminPanelBandOptions, type AdminPanelHeaderPresentation } from "./AdminPanelHeader";
export type EventsPanelColumn = "occurred" | "event" | "actor" | "resource" | "outcome";
export interface EventsPanelProps {
    adapter: AdminEventsAdapter;
    title?: string;
    /** Promote the panel heading and primary controls into the route-level header band. */
    headerPresentation?: AdminPanelHeaderPresentation;
    refreshLabel?: string;
    search?: {
        placeholder?: string;
    };
    pageSize?: number;
    presentation?: "feed" | "table";
    /** Optional host class for local styling without replacing the panel. */
    className?: string;
    /** Overrides the default timestamp presentation for occurredAt / source.updatedAt. */
    formatTimestamp?: (iso: string) => string;
    /**
     * Which event fields render, in the table's fixed order. Defaults to all
     * five. The feed presentation honours the same set; `event` (action and
     * message) is always shown there.
     */
    columns?: readonly EventsPanelColumn[];
    /** Replaces the default "No administrative events found." content. */
    emptyState?: ReactNode;
    /** Table presentation: persist this viewer's column widths under this key. */
    storageKey?: string;
    /** Table presentation: the table fills the viewport and scrolls itself under a pinned header (see `AdminDataTable` `fill`). */
    tableFill?: boolean;
    /** Adds the Hide/Show controls toggle: the source line, search and filters collapse, and the summary line keeps applied filters as removable chips. */
    headerCollapsible?: AdminPanelBandOptions<EventsPanelSummaryContext>;
    /** Status content between the source line and the filters; collapses with them. */
    headerSummary?: ReactNode;
}
export interface EventsPanelSummaryContext {
    query: AdminEventsQuery;
    total: number;
    /** The applied filters as removable chips. */
    chips: ReactNode;
}
export declare function EventsPanel({ adapter, title, headerPresentation, refreshLabel, search, pageSize, presentation, className, formatTimestamp, columns, emptyState, storageKey, tableFill, headerCollapsible, headerSummary, }: EventsPanelProps): import("react").JSX.Element;
