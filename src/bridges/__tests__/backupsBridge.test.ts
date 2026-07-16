import { describe, expect, it } from "vitest";
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

  it("hardcodes state to completed", async () => {
    const adapter = createBackupsAdapter({ listBackups: () => makeEntries(1) });
    const page = await adapter.list({});
    expect(page.items[0]!.state).toBe("completed");
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

  it("omits run/restore when not wired, and wires them through when provided", async () => {
    const bare = createBackupsAdapter({ listBackups: () => [] });
    expect(bare.run).toBeUndefined();
    expect(bare.restore).toBeUndefined();

    let ran = false;
    let restoredId: string | undefined;
    const wired = createBackupsAdapter({
      listBackups: () => [],
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
});
