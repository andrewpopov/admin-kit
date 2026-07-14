import { type AdminEventsAdapter } from "../core";
export interface EventsPanelProps {
    adapter: AdminEventsAdapter;
    title?: string;
    search?: {
        placeholder?: string;
    };
    pageSize?: number;
    /** Optional host class for local styling without replacing the panel. */
    className?: string;
}
export declare function EventsPanel({ adapter, title, search, pageSize, className }: EventsPanelProps): import("react").JSX.Element;
