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
    /** Wire to `restoreBackup`. Omit to make the action absent. */
    restoreBackup?: (input: {
        backupId: string;
    }) => void | Promise<void>;
}
/**
 * Builds an `AdminBackupsAdapter` over a `db-backup`-shaped listing (and
 * optional run/restore) seam. Pagination is computed in-memory since
 * db-backup returns its full listing in one call.
 */
export declare function createBackupsAdapter(options: CreateBackupsAdapterOptions): AdminBackupsAdapter;
