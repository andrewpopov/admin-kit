"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupNotRestorableError = void 0;
exports.createBackupsAdapter = createBackupsAdapter;
/** Thrown by `restore.execute` when the target entry is not `'completed'` —
 * a running or failed job has no on-disk artifact to restore from, so the
 * request is refused before ever reaching `restoreBackup`. */
class BackupNotRestorableError extends Error {
    constructor(backupId, state) {
        super(state === "unknown"
            ? `Backup ${backupId} is not restorable: no such backup exists.`
            : `Backup ${backupId} is not restorable (state: ${state}).`);
        this.name = "BackupNotRestorableError";
        this.backupId = backupId;
        this.state = state;
    }
}
exports.BackupNotRestorableError = BackupNotRestorableError;
const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"];
/** Formats a byte count as a human-readable size, e.g. `sizeBytes` -> "4.2 MB". */
function formatSize(sizeBytes) {
    if (!Number.isFinite(sizeBytes) || sizeBytes < 0)
        return "unknown";
    if (sizeBytes === 0)
        return "0 B";
    const exponent = Math.min(BYTE_UNITS.length - 1, Math.floor(Math.log(sizeBytes) / Math.log(1024)));
    const value = sizeBytes / 1024 ** exponent;
    const formatted = exponent === 0 ? String(value) : value.toFixed(1);
    return `${formatted} ${BYTE_UNITS[exponent]}`;
}
/** Strips db-backup's compression/encryption suffixes to derive a readable label. */
function labelFromFileName(fileName) {
    return fileName.replace(/\.(gz|gpg)(?=(\.(gz|gpg))*$)/g, "");
}
function mapEntry(entry) {
    return {
        id: entry.fileName,
        label: labelFromFileName(entry.fileName),
        createdAt: entry.createdAt,
        size: formatSize(entry.sizeBytes),
        // Absent state means 'completed' for back-compat with entries that
        // predate db-backup's state/error fields.
        state: entry.state ?? "completed",
        detail: entry.error ?? entry.retentionLabel ?? entry.retentionReason,
    };
}
/**
 * Builds an `AdminBackupsAdapter` over a `db-backup`-shaped listing (and
 * optional run/restore) seam. Pagination is computed in-memory since
 * db-backup returns its full listing in one call.
 */
function createBackupsAdapter(options) {
    const adapter = {
        async list(query = {}) {
            const all = await options.listBackups();
            const rawPage = query.page ?? 1;
            const rawPageSize = query.pageSize ?? (all.length || 1);
            const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
            const pageSize = Number.isFinite(rawPageSize)
                ? Math.max(1, Math.floor(rawPageSize))
                : all.length || 1;
            const start = (page - 1) * pageSize;
            const items = all.slice(start, start + pageSize).map(mapEntry);
            return { items, page, pageSize, total: all.length };
        },
    };
    return {
        ...adapter,
        ...(options.runBackup
            ? { run: { execute: async () => { await options.runBackup(); } } }
            : {}),
        ...(options.restoreBackup
            ? {
                restore: {
                    execute: async (input) => {
                        const all = await options.listBackups();
                        const entry = all.find((candidate) => candidate.fileName === input.backupId);
                        // Absence must refuse, not default to `'completed'`: a
                        // missing entry could not have produced a restorable
                        // artifact, so treat it distinctly from a known-completed one.
                        const state = entry ? entry.state ?? "completed" : "unknown";
                        if (state !== "completed") {
                            throw new BackupNotRestorableError(input.backupId, state);
                        }
                        await options.restoreBackup(input);
                    },
                },
            }
            : {}),
    };
}
