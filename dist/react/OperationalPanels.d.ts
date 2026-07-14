import type { AdminBackupsAdapter, AdminOperationalJobsAdapter, AdminOperationalStatus, AdminSettingsAdapter } from "../core";
export declare function AdminStatusSummary({ items }: {
    items: readonly AdminOperationalStatus[];
}): import("react").JSX.Element;
/** Displays host-owned scheduled, import, and retention runs without mislabeling them as backups. */
export declare function OperationalJobsPanel({ adapter, title, runLabel }: {
    adapter: AdminOperationalJobsAdapter;
    title?: string;
    runLabel?: string;
}): import("react").JSX.Element;
export declare function BackupsPanel({ adapter, title }: {
    adapter: AdminBackupsAdapter;
    title?: string;
}): import("react").JSX.Element;
export declare function SettingsPanel({ adapter, title }: {
    adapter: AdminSettingsAdapter;
    title?: string;
}): import("react").JSX.Element;
