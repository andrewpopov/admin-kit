import { type AdminLogEntry, type AdminLogsAdapter } from "../core";
export interface LogsPanelProps<Entry extends AdminLogEntry = AdminLogEntry> {
    adapter: AdminLogsAdapter<Entry>;
    title?: string;
    pollIntervalMs?: number;
    defaultAutoRefresh?: boolean;
    formatTimestamp?: (iso: string) => string;
    className?: string;
}
/** Runtime output viewer; structured audit and authorization events belong in EventsPanel. */
export declare function LogsPanel<Entry extends AdminLogEntry = AdminLogEntry>({ adapter, title, pollIntervalMs, defaultAutoRefresh, formatTimestamp, className, }: LogsPanelProps<Entry>): import("react").JSX.Element;
