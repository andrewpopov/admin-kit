import { type AdminEventsAdapter } from "../core";
export interface EventsPanelProps {
    adapter: AdminEventsAdapter;
    title?: string;
    search?: {
        placeholder?: string;
    };
    pageSize?: number;
}
export declare function EventsPanel({ adapter, title, search, pageSize }: EventsPanelProps): import("react").JSX.Element;
