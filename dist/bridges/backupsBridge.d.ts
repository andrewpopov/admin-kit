import type { AdminBackupsAdapter } from "../core/operations";
/**
 * Foreign contract — mirrors `db-backup`'s `BackupEntry` (src/index.d.ts).
 * Only the fields this bridge reads are declared.
 */
export interface ForeignBackupEntry {
    fileName: string;
    createdAt: string;
    sizeBytes: number;
    retentionReason?: string;
    retentionLabel?: string;
    /** Mirrors db-backup's `BackupEntry.state`. Absent means `'completed'` —
     * every entry predating this field was already a finished artifact. */
    state?: "completed" | "running" | "failed";
    /** Mirrors db-backup's `BackupEntry.error`: `'failed'` marker rows only. */
    error?: string;
}
export interface CreateBackupsAdapterOptions {
    /**
     * Returns every known backup, newest first (db-backup's own listing order).
     * Wire this to `listBackupsWithPlan(options).backups` or an equivalent
     * host-owned query. Pagination below is in-memory over this full list —
     * db-backup has no server-side pagination of its own.
     */
    listBackups: () => readonly ForeignBackupEntry[] | Promise<readonly ForeignBackupEntry[]>;
    /** Wire to `runBackupJob`/`runBackupJobAsync`. Omit to make the action absent. */
    runBackup?: () => void | Promise<void>;
    /** Wire to `restoreBackup`. Omit to make the action absent. Never invoked
     * for a non-`'completed'` entry — `restore.execute` refuses those itself
     * with a {@link BackupNotRestorableError} before reaching this seam. */
    restoreBackup?: (input: {
        backupId: string;
    }) => void | Promise<void>;
}
/** Thrown by `restore.execute` when the target entry is not `'completed'` —
 * a running or failed job has no on-disk artifact to restore from, so the
 * request is refused before ever reaching `restoreBackup`. */
export declare class BackupNotRestorableError extends Error {
    readonly backupId: string;
    readonly state: "running" | "failed" | "unknown";
    constructor(backupId: string, state: "running" | "failed" | "unknown");
}
/**
 * Builds an `AdminBackupsAdapter` over a `db-backup`-shaped listing (and
 * optional run/restore) seam. Pagination is computed in-memory since
 * db-backup returns its full listing in one call.
 */
export declare function createBackupsAdapter(options: CreateBackupsAdapterOptions): AdminBackupsAdapter;
