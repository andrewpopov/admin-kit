import { type AdminBackupsAdapter, type AdminOperationalJobsAdapter, type AdminOperationalStatus, type AdminSettingsAdapter } from "../core";
export interface AdminStatusSummaryProps {
    items: readonly AdminOperationalStatus[];
}
export declare function AdminStatusSummary({ items }: AdminStatusSummaryProps): import("react").JSX.Element;
export interface OperationalJobsPanelProps {
    adapter: AdminOperationalJobsAdapter;
    title?: string;
    runLabel?: string;
    pageSize?: number;
    /** Optional host class for local styling without replacing the panel. */
    className?: string;
    /** Overrides the default timestamp presentation for startedAt / finishedAt. */
    formatTimestamp?: (iso: string) => string;
    /** Explains the useful zero-run state instead of rendering an unexplained empty table. */
    emptyState?: {
        title: string;
        detail?: string;
    };
}
/** Displays host-owned scheduled, import, and retention runs without mislabeling them as backups. */
export declare function OperationalJobsPanel({ adapter, title, runLabel, pageSize, className, formatTimestamp, emptyState }: OperationalJobsPanelProps): import("react").JSX.Element;
export interface BackupsPanelProps {
    adapter: AdminBackupsAdapter;
    title?: string;
    runLabel?: string;
    pageSize?: number;
    /** Optional host class for local styling without replacing the panel. */
    className?: string;
    /** Overrides the default timestamp presentation for createdAt. */
    formatTimestamp?: (iso: string) => string;
}
export declare function BackupsPanel({ adapter, title, runLabel, pageSize, className, formatTimestamp }: BackupsPanelProps): import("react").JSX.Element;
export interface SettingsPanelProps {
    adapter: AdminSettingsAdapter;
    title?: string;
    /** Optional host class for local styling without replacing the panel. */
    className?: string;
}
export declare function SettingsPanel({ adapter, title, className }: SettingsPanelProps): import("react").JSX.Element;
