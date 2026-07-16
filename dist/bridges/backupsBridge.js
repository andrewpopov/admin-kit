"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBackupsAdapter = createBackupsAdapter;
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
        // db-backup's BackupEntry cannot represent an in-progress or failed run —
        // every entry it returns already succeeded and is on disk. Tracked as
        // PKG-28: surface running/failed state once db-backup exposes job status.
        state: "completed",
        detail: entry.retentionLabel ?? entry.retentionReason,
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
            const page = Math.max(1, Math.floor(query.page ?? 1));
            const pageSize = Math.max(1, Math.floor(query.pageSize ?? (all.length || 1)));
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
                        await options.restoreBackup(input);
                    },
                },
            }
            : {}),
    };
}
