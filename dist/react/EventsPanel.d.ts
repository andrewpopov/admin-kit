import { type AdminEventsAdapter } from "../core";
import { type AdminPanelHeaderPresentation } from "./AdminPanelHeader";
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
}
export declare function EventsPanel({ adapter, title, headerPresentation, refreshLabel, search, pageSize, presentation, className, formatTimestamp, }: EventsPanelProps): import("react").JSX.Element;
