import { describe, expect, it } from "vitest";
import { BackupNotRestorableError } from "../index";
import { createBackupsAdapter } from "../backupsBridge";
import type { ForeignBackupEntry } from "../backupsBridge";

function makeEntries(count: number): ForeignBackupEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    fileName: `sqlite-backup-2024-01-${String(i + 1).padStart(2, "0")}.db.gz`,
    createdAt: `2024-01-${String(i + 1).padStart(2, "0")}T00:00:00.000Z`,
    sizeBytes: 1024 * (i + 1),
  }));
}

describe("createBackupsAdapter", () => {
  it("uses fileName as id and a stripped label", async () => {
    const adapter = createBackupsAdapter({ listBackups: () => makeEntries(1) });
    const page = await adapter.list({});
    expect(page.items[0]!.id).toBe("sqlite-backup-2024-01-01.db.gz");
    expect(page.items[0]!.label).toBe("sqlite-backup-2024-01-01.db");
  });

  it("formats size as a human-readable string", async () => {
    const adapter = createBackupsAdapter({
      listBackups: () => [
        { fileName: "a", createdAt: "2024-01-01T00:00:00.000Z", sizeBytes: 0 },
        { fileName: "b", createdAt: "2024-01-01T00:00:00.000Z", sizeBytes: 2048 },
        { fileName: "c", createdAt: "2024-01-01T00:00:00.000Z", sizeBytes: 5 * 1024 * 1024 },
      ],
    });
    const page = await adapter.list({ pageSize: 10 });
    expect(page.items.map((i) => i.size)).toEqual(["0 B", "2.0 KB", "5.0 MB"]);
  });

  it("defaults state to completed when the foreign entry omits it", async () => {
    const adapter = createBackupsAdapter({ listBackups: () => makeEntries(1) });
    const page = await adapter.list({});
    expect(page.items[0]!.state).toBe("completed");
  });

  it("passes through running/failed state and surfaces the error as detail", async () => {
    const adapter = createBackupsAdapter({
      listBackups: () => [
        {
          fileName: "sqlite-backup-2024-02-01-job1.inprogress",
          createdAt: "2024-02-01T00:00:00.000Z",
          sizeBytes: 0,
          state: "running",
        },
        {
          fileName: "sqlite-backup-2024-02-02-job2.failed",
          createdAt: "2024-02-02T00:00:00.000Z",
          sizeBytes: 0,
          state: "failed",
          error: "disk full",
        },
      ],
    });

    const page = await adapter.list({});
    expect(page.items[0]!.state).toBe("running");
    expect(page.items[1]!.state).toBe("failed");
    expect(page.items[1]!.detail).toBe("disk full");
  });

  it("paginates in-memory within bounds, clamping page/pageSize below 1", async () => {
    const adapter = createBackupsAdapter({ listBackups: () => makeEntries(25) });

    const firstPage = await adapter.list({ page: 1, pageSize: 10 });
    expect(firstPage.items).toHaveLength(10);
    expect(firstPage.total).toBe(25);

    const lastPage = await adapter.list({ page: 3, pageSize: 10 });
    expect(lastPage.items).toHaveLength(5);

    const beyondEnd = await adapter.list({ page: 99, pageSize: 10 });
    expect(beyondEnd.items).toHaveLength(0);
    expect(beyondEnd.total).toBe(25);

    const clamped = await adapter.list({ page: 0, pageSize: -5 });
    expect(clamped.page).toBe(1);
    expect(clamped.pageSize).toBeGreaterThanOrEqual(1);
  });

  it("coerces non-finite page/pageSize to the defaults instead of producing an empty NaN page", async () => {
    const adapter = createBackupsAdapter({ listBackups: () => makeEntries(5) });

    const nanPage = await adapter.list({ page: NaN, pageSize: 10 });
    expect(nanPage.page).toBe(1);
    expect(Number.isNaN(nanPage.page)).toBe(false);
    expect(nanPage.items).toHaveLength(5);

    const nanPageSize = await adapter.list({ page: 1, pageSize: NaN });
    expect(Number.isNaN(nanPageSize.pageSize)).toBe(false);
    expect(nanPageSize.items).toHaveLength(5);

    const infinitePageSize = await adapter.list({ page: 1, pageSize: Infinity });
    expect(Number.isFinite(infinitePageSize.pageSize)).toBe(true);
    expect(infinitePageSize.items).toHaveLength(5);
  });

  it("omits run/restore when not wired, and wires them through when provided", async () => {
    const bare = createBackupsAdapter({ listBackups: () => [] });
    expect(bare.run).toBeUndefined();
    expect(bare.restore).toBeUndefined();

    let ran = false;
    let restoredId: string | undefined;
    const wired = createBackupsAdapter({
      listBackups: () => [
        {
          fileName: "sqlite-backup-2024-01-01.db.gz",
          createdAt: "2024-01-01T00:00:00.000Z",
          sizeBytes: 1024,
        },
      ],
      runBackup: () => {
        ran = true;
      },
      restoreBackup: ({ backupId }) => {
        restoredId = backupId;
      },
    });

    await wired.run!.execute();
    expect(ran).toBe(true);

    await wired.restore!.execute({ backupId: "sqlite-backup-2024-01-01.db.gz" });
    expect(restoredId).toBe("sqlite-backup-2024-01-01.db.gz");
  });

  it("refuses to restore a non-completed entry with a structured error, without invoking restoreBackup", async () => {
    let restoreCalls = 0;
    const adapter = createBackupsAdapter({
      listBackups: () => [
        {
          fileName: "sqlite-backup-2024-02-01-job1.inprogress",
          createdAt: "2024-02-01T00:00:00.000Z",
          sizeBytes: 0,
          state: "running",
        },
        {
          fileName: "sqlite-backup-2024-02-02-job2.failed",
          createdAt: "2024-02-02T00:00:00.000Z",
          sizeBytes: 0,
          state: "failed",
          error: "disk full",
        },
      ],
      restoreBackup: () => {
        restoreCalls += 1;
      },
    });

    await expect(
      adapter.restore!.execute({ backupId: "sqlite-backup-2024-02-01-job1.inprogress" }),
    ).rejects.toBeInstanceOf(BackupNotRestorableError);

    let failure: unknown;
    try {
      await adapter.restore!.execute({ backupId: "sqlite-backup-2024-02-02-job2.failed" });
    } catch (err) {
      failure = err;
    }
    expect(failure).toBeInstanceOf(BackupNotRestorableError);
    const notRestorable = failure as BackupNotRestorableError;
    expect(notRestorable.backupId).toBe("sqlite-backup-2024-02-02-job2.failed");
    expect(notRestorable.state).toBe("failed");

    expect(restoreCalls).toBe(0);
  });

  it("refuses to restore an id absent from the listing instead of defaulting it to completed", async () => {
    let restoreCalls = 0;
    const adapter = createBackupsAdapter({
      listBackups: () => [
        {
          fileName: "sqlite-backup-2024-03-01.db.gz",
          createdAt: "2024-03-01T00:00:00.000Z",
          sizeBytes: 1024,
        },
      ],
      restoreBackup: () => {
        restoreCalls += 1;
      },
    });

    let failure: unknown;
    try {
      await adapter.restore!.execute({ backupId: "does-not-exist.db.gz" });
    } catch (err) {
      failure = err;
    }
    expect(failure).toBeInstanceOf(BackupNotRestorableError);
    const notRestorable = failure as BackupNotRestorableError;
    expect(notRestorable.backupId).toBe("does-not-exist.db.gz");
    expect(notRestorable.state).toBe("unknown");
    expect(restoreCalls).toBe(0);
  });
});
