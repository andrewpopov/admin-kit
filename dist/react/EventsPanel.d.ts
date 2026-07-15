import { type AdminEventsAdapter } from "../core";
export interface EventsPanelProps {
    adapter: AdminEventsAdapter;
    title?: string;
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
export declare function EventsPanel({ adapter, title, search, pageSize, presentation, className, formatTimestamp }: EventsPanelProps): import("react").JSX.Element;
