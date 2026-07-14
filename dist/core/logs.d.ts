export type AdminLogTone = "neutral" | "info" | "success" | "warning" | "danger";
export interface AdminLogFilterOption {
    value: string;
    label: string;
}
/** A process, file, or host-defined runtime output stream. */
export interface AdminLogSource {
    value: string;
    label: string;
    detail?: string;
}
export interface AdminLogValue {
    value: string;
    label: string;
    tone?: AdminLogTone;
}
/** List-safe presentation data for one runtime log line. */
export interface AdminLogEntry {
    id: string;
    message: string;
    raw?: string;
    timestamp?: string | null;
    level?: AdminLogValue | null;
    category?: string | null;
}
export interface AdminLogsQuery {
    source?: string;
    limit: number;
    level?: string;
    category?: string;
    search?: string;
}
export interface AdminLogsSnapshot<Entry extends AdminLogEntry = AdminLogEntry> {
    source: string | null;
    sources: readonly AdminLogSource[];
    entries: readonly Entry[];
    /** Total matching or available lines before this bounded snapshot. */
    total: number;
    generatedAt?: string;
    levels?: readonly AdminLogFilterOption[];
    categories?: readonly AdminLogFilterOption[];
}
export interface AdminLogsAdapter<Entry extends AdminLogEntry = AdminLogEntry> {
    read(query: AdminLogsQuery): Promise<AdminLogsSnapshot<Entry>>;
    lineLimits?: readonly number[];
    defaultLineLimit?: number;
    defaultSource?: string;
}
export declare function defineAdminLogsAdapter<Entry extends AdminLogEntry = AdminLogEntry>(adapter: AdminLogsAdapter<Entry>): AdminLogsAdapter<Entry>;
export declare function validateAdminLogsSnapshot<Entry extends AdminLogEntry>(snapshot: AdminLogsSnapshot<Entry>): AdminLogsSnapshot<Entry>;
