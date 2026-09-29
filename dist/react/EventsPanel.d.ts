import { type ReactNode } from "react";
import { type AdminEventsAdapter } from "../core";
import { type AdminPanelHeaderPresentation } from "./AdminPanelHeader";
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
}
export declare function EventsPanel({ adapter, title, headerPresentation, refreshLabel, search, pageSize, presentation, className, formatTimestamp, columns, emptyState, }: EventsPanelProps): import("react").JSX.Element;
