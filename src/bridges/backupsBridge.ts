import type { AdminBackupsAdapter, AdminBackupSummary } from "../core/operations";

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
  restoreBackup?: (input: { backupId: string }) => void | Promise<void>;
}

/** Thrown by `restore.execute` when the target entry is not `'completed'` —
 * a running or failed job has no on-disk artifact to restore from, so the
 * request is refused before ever reaching `restoreBackup`. */
export class BackupNotRestorableError extends Error {
  readonly backupId: string;
  readonly state: "running" | "failed" | "unknown";

  constructor(backupId: string, state: "running" | "failed" | "unknown") {
    super(
      state === "unknown"
        ? `Backup ${backupId} is not restorable: no such backup exists.`
        : `Backup ${backupId} is not restorable (state: ${state}).`,
    );
    this.name = "BackupNotRestorableError";
    this.backupId = backupId;
    this.state = state;
  }
}

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

/** Formats a byte count as a human-readable size, e.g. `sizeBytes` -> "4.2 MB". */
function formatSize(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) return "unknown";
  if (sizeBytes === 0) return "0 B";
  const exponent = Math.min(
    BYTE_UNITS.length - 1,
    Math.floor(Math.log(sizeBytes) / Math.log(1024)),
  );
  const value = sizeBytes / 1024 ** exponent;
  const formatted = exponent === 0 ? String(value) : value.toFixed(1);
  return `${formatted} ${BYTE_UNITS[exponent]}`;
}

/** Strips db-backup's compression/encryption suffixes to derive a readable label. */
function labelFromFileName(fileName: string): string {
  return fileName.replace(/\.(gz|gpg)(?=(\.(gz|gpg))*$)/g, "");
}

function mapEntry(entry: ForeignBackupEntry): AdminBackupSummary {
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
export function createBackupsAdapter(
  options: CreateBackupsAdapterOptions,
): AdminBackupsAdapter {
  const adapter: AdminBackupsAdapter = {
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
      ? { run: { execute: async () => { await options.runBackup!(); } } }
      : {}),
    ...(options.restoreBackup
      ? {
          restore: {
            execute: async (input: { backupId: string }) => {
              const all = await options.listBackups();
              const entry = all.find((candidate) => candidate.fileName === input.backupId);
              // Absence must refuse, not default to `'completed'`: a
              // missing entry could not have produced a restorable
              // artifact, so treat it distinctly from a known-completed one.
              const state = entry ? entry.state ?? "completed" : "unknown";
              if (state !== "completed") {
                throw new BackupNotRestorableError(input.backupId, state);
              }
              await options.restoreBackup!(input);
            },
          },
        }
      : {}),
  };
}
