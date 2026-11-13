import { type ReactNode } from "react";
import { type AdminBackupsAdapter, type AdminOperationalJobsAdapter, type AdminOperationalStatus, type AdminSettingsAdapter } from "../core";
import { type AdminPanelBandOptions, type AdminPanelHeaderPresentation } from "./AdminPanelHeader";
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
    /** Persist this viewer's column widths under this key. */
    storageKey?: string;
    /** Promote the panel heading and run action into the route-level header band. */
    headerPresentation?: AdminPanelHeaderPresentation;
    /** Adds the Hide/Show controls toggle: the run count and `headerSummary` collapse. The run action never does. */
    headerCollapsible?: AdminPanelBandOptions<{
        total: number;
    }>;
    /** Status content under the run count; collapses with it. */
    headerSummary?: ReactNode;
}
/** Displays host-owned scheduled, import, and retention runs without mislabeling them as backups. */
export declare function OperationalJobsPanel({ adapter, title, runLabel, pageSize, className, formatTimestamp, emptyState, storageKey, headerPresentation, headerCollapsible, headerSummary, }: OperationalJobsPanelProps): import("react").JSX.Element;
export interface BackupsPanelProps {
    adapter: AdminBackupsAdapter;
    title?: string;
    runLabel?: string;
    pageSize?: number;
    /** Optional host class for local styling without replacing the panel. */
    className?: string;
    /** Overrides the default timestamp presentation for createdAt. */
    formatTimestamp?: (iso: string) => string;
    /** Persist this viewer's column widths under this key. */
    storageKey?: string;
}
export declare function BackupsPanel({ adapter, title, runLabel, pageSize, className, formatTimestamp, storageKey, }: BackupsPanelProps): import("react").JSX.Element;
export interface SettingsPanelProps {
    adapter: AdminSettingsAdapter;
    title?: string;
    /** Optional host class for local styling without replacing the panel. */
    className?: string;
}
export declare function SettingsPanel({ adapter, title, className }: SettingsPanelProps): import("react").JSX.Element;
