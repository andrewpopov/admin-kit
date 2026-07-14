import type { AdminBackupsAdapter, AdminOperationalStatus, AdminSettingsAdapter } from "../core";
export declare function AdminStatusSummary({ items }: {
    items: readonly AdminOperationalStatus[];
}): import("react").JSX.Element;
export declare function BackupsPanel({ adapter, title }: {
    adapter: AdminBackupsAdapter;
    title?: string;
}): import("react").JSX.Element;
export declare function SettingsPanel({ adapter, title }: {
    adapter: AdminSettingsAdapter;
    title?: string;
}): import("react").JSX.Element;
