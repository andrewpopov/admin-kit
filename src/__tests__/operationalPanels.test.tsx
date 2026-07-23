// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminStatusSummary, BackupsPanel, OperationalJobsPanel, SettingsPanel } from "../react";

afterEach(cleanup);

describe("operational panels", () => {
  it("renders status and backup rows through the shared semantic table contract", async () => {
    render(
      <>
        <AdminStatusSummary items={[{ label: "Recovery", value: "Healthy", tone: "healthy" }]} />
        <BackupsPanel
          adapter={{
            list: vi.fn().mockResolvedValue({
              items: [{ id: "b1", label: "Daily", createdAt: "Today", state: "completed" }],
              page: 1,
              pageSize: 25,
              total: 1,
            }),
          }}
        />
      </>,
    );
    expect(screen.getByText("Healthy")).toBeTruthy();
    const table = await screen.findByRole("table");
    expect(table.classList.contains("admin-kit__table")).toBe(true);
    expect(screen.getByRole("columnheader", { name: "Backup" }).getAttribute("scope")).toBe("col");
  });
  it("explains the empty backup state and keeps the recovery action prominent", async () => {
    render(
      <BackupsPanel
        adapter={{
          list: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 25, total: 0 }),
          run: { execute: vi.fn() },
        }}
        runLabel="Run backup now"
      />,
    );
    expect(
      await screen.findByText("No backups yet. Run a backup to create your first recovery point."),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Run backup now" })
        .classList.contains("admin-kit__button--primary"),
    ).toBe(true);
  });
  it("does not restore a backup until the confirmation dialog is confirmed", async () => {
    const restore = vi.fn().mockResolvedValue(undefined);
    render(
      <BackupsPanel
        adapter={{
          list: vi.fn().mockResolvedValue({
            items: [{ id: "b1", label: "Daily", createdAt: "Today", state: "completed" }],
            page: 1,
            pageSize: 25,
            total: 1,
          }),
          restore: { execute: restore },
        }}
      />,
    );

    const restoreButton = await screen.findByRole("button", { name: "Restore" });
    fireEvent.click(restoreButton);
    expect(restore).not.toHaveBeenCalled();

    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("Restore backup");
    expect(dialog.textContent?.toLowerCase()).toContain("cannot be reversed");

    fireEvent.click(screen.getByRole("button", { name: "Restore backup" }));
    await waitFor(() => expect(restore).toHaveBeenCalledWith({ backupId: "b1" }));
  });

  it("renders settings fields through a host-owned adapter", async () => {
    render(
      <SettingsPanel
        adapter={{
          load: vi.fn().mockResolvedValue([{ id: "retention", label: "Retention", value: "30" }]),
          save: { execute: vi.fn() },
        }}
      />,
    );
    expect(await screen.findByDisplayValue("30")).toBeTruthy();
  });
  it("uses the shared switch for boolean settings and saves the staged value", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(
      <SettingsPanel
        adapter={{
          load: vi.fn().mockResolvedValue([
            {
              id: "registration",
              label: "Public registration",
              description: "Allow visitors to create accounts.",
              type: "boolean",
              value: false,
            },
          ]),
          save: { execute: save },
        }}
      />,
    );

    const registration = await screen.findByRole("switch", { name: /Public registration/ });
    expect(registration.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(registration);
    expect(registration.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("Enabled")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith({ values: { registration: true } }));
  });
  it("uses a distinct operational-jobs vocabulary for scheduled work", async () => {
    render(
      <OperationalJobsPanel
        title="Retention"
        runLabel="Run retention"
        adapter={{
          list: vi.fn().mockResolvedValue({
            items: [
              { id: "r1", label: "Retention policy", startedAt: "Today", state: "completed" },
            ],
            page: 1,
            pageSize: 25,
            total: 1,
          }),
        }}
      />,
    );
    expect(await screen.findByText("Retention policy")).toBeTruthy();
    expect(screen.getByRole("table").classList.contains("admin-kit__table")).toBe(true);
  });

  it("explains the zero-run state while keeping the run action available", async () => {
    const run = vi.fn().mockResolvedValue(undefined);
    const list = vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 25, total: 0 });
    render(
      <OperationalJobsPanel
        adapter={{ list, run: { execute: run } }}
        emptyState={{
          title: "No retention runs yet.",
          detail: "The policy is active before the first manual run.",
        }}
        runLabel="Run retention now"
      />,
    );

    await screen.findByText("No retention runs yet.");
    expect(screen.getByText("The policy is active before the first manual run.")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Run retention now" }));
    await waitFor(() => expect(run).toHaveBeenCalledOnce());
  });

  it("paginates backups instead of silently truncating past the first page, and shows the true total", async () => {
    const makeBackup = (id: string) => ({
      id,
      label: `Backup ${id}`,
      createdAt: "Today",
      state: "completed" as const,
    });
    const page1 = Array.from({ length: 25 }, (_, i) => makeBackup(`p1-${i}`));
    const page2 = Array.from({ length: 25 }, (_, i) => makeBackup(`p2-${i}`));
    const list = vi.fn().mockImplementation(async ({ page }: { page: number }) => ({
      items: page === 1 ? page1 : page2,
      page,
      pageSize: 25,
      total: 60,
    }));
    render(<BackupsPanel adapter={{ list }} />);

    await screen.findByText("Backup p1-0");
    expect(screen.getByText("60 recent recovery points")).toBeTruthy();
    expect(screen.getByRole("navigation", { name: "Backups pagination" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(list).toHaveBeenLastCalledWith({ page: 2, pageSize: 25 }));
    await screen.findByText("Backup p2-0");
    expect(screen.queryByText("Backup p1-0")).toBeNull();
    expect(screen.getByText("Page 2 of 3")).toBeTruthy();
    expect(screen.getByText("60 recent recovery points")).toBeTruthy();
  });

  it("paginates operational jobs instead of silently truncating past the first page, and shows the true total", async () => {
    const makeJob = (id: string) => ({
      id,
      label: `Job ${id}`,
      startedAt: "Today",
      state: "completed" as const,
    });
    const page1 = Array.from({ length: 25 }, (_, i) => makeJob(`p1-${i}`));
    const page2 = Array.from({ length: 25 }, (_, i) => makeJob(`p2-${i}`));
    const list = vi.fn().mockImplementation(async ({ page }: { page: number }) => ({
      items: page === 1 ? page1 : page2,
      page,
      pageSize: 25,
      total: 60,
    }));
    render(<OperationalJobsPanel adapter={{ list }} />);

    await screen.findByText("Job p1-0");
    expect(screen.getByText("60 recent runs")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(list).toHaveBeenLastCalledWith({ page: 2, pageSize: 25 }));
    await screen.findByText("Job p2-0");
    expect(screen.queryByText("Job p1-0")).toBeNull();
    expect(screen.getByText("Page 2 of 3")).toBeTruthy();
  });

  it("ignores a stale page-2 response that resolves after navigating back to page 1", async () => {
    const page1 = [
      { id: "b1", label: "Backup b1", createdAt: "Today", state: "completed" as const },
    ];
    const page2 = [
      { id: "b2", label: "Backup b2", createdAt: "Today", state: "completed" as const },
    ];
    const page3 = [
      { id: "b3", label: "Backup b3", createdAt: "Today", state: "completed" as const },
    ];
    let resolvePage2: ((value: unknown) => void) | undefined;
    const list = vi
      .fn()
      .mockResolvedValueOnce({ items: page1, page: 1, pageSize: 1, total: 3 })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolvePage2 = resolve;
          }),
      )
      .mockResolvedValueOnce({ items: page3, page: 1, pageSize: 1, total: 3 });
    render(<BackupsPanel adapter={{ list }} pageSize={1} />);

    await screen.findByText("Backup b1");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));

    // Navigate back to page 1 before the page-2 request resolves; the page-1
    // reload (3rd call) resolves first.
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(3));
    await screen.findByText("Backup b3");

    // The stale page-2 response arrives late; it must not overwrite page 1.
    resolvePage2?.({ items: page2, page: 2, pageSize: 1, total: 3 });
    await waitFor(() => expect(screen.getByText("Backup b3")).toBeTruthy());
    expect(screen.queryByText("Backup b2")).toBeNull();
  });

  it("formats operational job and backup timestamps, and preserves the In progress fallback", async () => {
    render(
      <>
        <OperationalJobsPanel
          adapter={{
            list: vi.fn().mockResolvedValue({
              items: [
                {
                  id: "r1",
                  label: "Finished job",
                  startedAt: "2026-07-13T09:00:00.000Z",
                  finishedAt: "2026-07-13T09:05:00.000Z",
                  state: "completed" as const,
                },
                {
                  id: "r2",
                  label: "Running job",
                  startedAt: "2026-07-13T09:10:00.000Z",
                  state: "running" as const,
                },
              ],
              page: 1,
              pageSize: 25,
              total: 2,
            }),
          }}
        />
        <BackupsPanel
          adapter={{
            list: vi.fn().mockResolvedValue({
              items: [
                {
                  id: "b1",
                  label: "Nightly",
                  createdAt: "2026-07-13T02:00:00.000Z",
                  state: "completed" as const,
                },
              ],
              page: 1,
              pageSize: 25,
              total: 1,
            }),
          }}
        />
      </>,
    );

    await screen.findByText("Finished job");
    expect(screen.queryByText(/2026-07-13T09:00:00\.000Z/)).toBeNull();
    expect(screen.queryByText(/2026-07-13T09:05:00\.000Z/)).toBeNull();
    expect(screen.getByText("In progress")).toBeTruthy();

    await screen.findByText("Nightly");
    expect(screen.queryByText(/2026-07-13T02:00:00\.000Z/)).toBeNull();
  });

  it("lets a host-supplied formatTimestamp override operational job and backup presentation", async () => {
    render(
      <>
        <OperationalJobsPanel
          formatTimestamp={(iso) => `stamp:${iso}`}
          adapter={{
            list: vi.fn().mockResolvedValue({
              items: [
                {
                  id: "r1",
                  label: "Finished job",
                  startedAt: "2026-07-13T09:00:00.000Z",
                  finishedAt: "2026-07-13T09:05:00.000Z",
                  state: "completed" as const,
                },
              ],
              page: 1,
              pageSize: 25,
              total: 1,
            }),
          }}
        />
        <BackupsPanel
          formatTimestamp={(iso) => `stamp:${iso}`}
          adapter={{
            list: vi.fn().mockResolvedValue({
              items: [
                {
                  id: "b1",
                  label: "Nightly",
                  createdAt: "2026-07-13T02:00:00.000Z",
                  state: "completed" as const,
                },
              ],
              page: 1,
              pageSize: 25,
              total: 1,
            }),
          }}
        />
      </>,
    );

    await screen.findByText(/stamp:2026-07-13T09:00:00\.000Z/);
    await screen.findByText(/stamp:2026-07-13T09:05:00\.000Z/);
    await screen.findByText(/stamp:2026-07-13T02:00:00\.000Z/);
  });

  it("never commits a request left in flight across two subsequent page changes", async () => {
    // Regression for the latestLoadId guard only being bumped once a new
    // load() call actually begins: chain three transitions (page 1 -> 2 ->
    // 3) while page 1's request is still in flight, so the invalidation
    // must survive across two intervening transitions, not just one.
    const page1Items = [
      { id: "b1", label: "Backup b1", createdAt: "Today", state: "completed" as const },
    ];
    const page2Items = [
      { id: "b2", label: "Backup b2", createdAt: "Today", state: "completed" as const },
    ];
    const page3Items = [
      { id: "b3", label: "Backup b3", createdAt: "Today", state: "completed" as const },
    ];
    let resolveStalePage1: ((value: unknown) => void) | undefined;
    const list = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveStalePage1 = resolve;
          }),
      )
      .mockResolvedValueOnce({ items: page2Items, page: 2, pageSize: 1, total: 3 })
      .mockResolvedValueOnce({ items: page3Items, page: 3, pageSize: 1, total: 3 });
    render(<BackupsPanel adapter={{ list }} pageSize={1} />);

    // Page 1's request never resolves yet; the panel is still on the
    // loading state. Advance straight to page 2, then page 3 — this can
    // only be triggered by the pagination controls once data is on screen,
    // so drive both transitions purely through query/page identity changes
    // that don't depend on the first request settling.
    await waitFor(() => expect(list).toHaveBeenCalledTimes(1));

    resolveStalePage1?.({ items: page1Items, page: 1, pageSize: 1, total: 3 });
    await screen.findByText("Backup b1");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Backup b2");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Backup b3");

    expect(screen.queryByText("Backup b1")).toBeNull();
    expect(screen.queryByText("Backup b2")).toBeNull();
    expect(list).toHaveBeenCalledTimes(3);
  });

  it("invalidates an in-flight request on unmount so its resolution cannot leak a late state update", async () => {
    let resolvePending: ((value: unknown) => void) | undefined;
    const list = vi.fn().mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePending = resolve;
        }),
    );
    const { unmount } = render(<BackupsPanel adapter={{ list }} pageSize={1} />);
    await waitFor(() => expect(list).toHaveBeenCalledTimes(1));

    unmount();

    // Resolving after unmount must not throw (the effect cleanup already
    // invalidated this load id).
    expect(() =>
      resolvePending?.({
        items: [{ id: "b1", label: "Backup b1", createdAt: "Today", state: "completed" as const }],
        page: 1,
        pageSize: 1,
        total: 1,
      }),
    ).not.toThrow();
  });

  it("clamps to the last valid page instead of stranding the user on an empty out-of-range page (BackupsPanel)", async () => {
    const list = vi
      .fn()
      .mockResolvedValueOnce({
        items: [{ id: "p1", label: "Backup p1", createdAt: "Today", state: "completed" as const }],
        page: 1,
        pageSize: 1,
        total: 3,
      })
      .mockResolvedValueOnce({
        items: [{ id: "p2", label: "Backup p2", createdAt: "Today", state: "completed" as const }],
        page: 2,
        pageSize: 1,
        total: 3,
      })
      .mockResolvedValueOnce({
        items: [{ id: "p3", label: "Backup p3", createdAt: "Today", state: "completed" as const }],
        page: 3,
        pageSize: 1,
        total: 3,
      })
      // Rows were deleted between requests: only 2 remain, so page 3 is now
      // out of range for the response that lands right after "Run backup".
      .mockResolvedValue({
        items: [{ id: "p2", label: "Backup p2", createdAt: "Today", state: "completed" as const }],
        page: 3,
        pageSize: 1,
        total: 2,
      });
    render(
      <BackupsPanel
        adapter={{ list, run: { execute: vi.fn().mockResolvedValue(undefined) } }}
        pageSize={1}
      />,
    );

    await screen.findByText("Backup p1");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Backup p2");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Backup p3");
    expect(screen.getByText("Page 3 of 3")).toBeTruthy();

    // Triggers a reload while staying on page 3; the response reports a
    // shrunk total that makes page 3 invalid.
    fireEvent.click(screen.getByRole("button", { name: "Run backup" }));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(4));

    await waitFor(() => expect(screen.getByText("Page 2 of 2")).toBeTruthy());
    expect(screen.queryByText("Page 3 of 2")).toBeNull();
    expect(screen.getByText("Backup p2")).toBeTruthy();
  });

  it("clamps to the last valid page instead of stranding the user on an empty out-of-range page (OperationalJobsPanel)", async () => {
    const list = vi
      .fn()
      .mockResolvedValueOnce({
        items: [{ id: "p1", label: "Job p1", startedAt: "Today", state: "completed" as const }],
        page: 1,
        pageSize: 1,
        total: 3,
      })
      .mockResolvedValueOnce({
        items: [{ id: "p2", label: "Job p2", startedAt: "Today", state: "completed" as const }],
        page: 2,
        pageSize: 1,
        total: 3,
      })
      .mockResolvedValueOnce({
        items: [{ id: "p3", label: "Job p3", startedAt: "Today", state: "completed" as const }],
        page: 3,
        pageSize: 1,
        total: 3,
      })
      .mockResolvedValue({
        items: [{ id: "p2", label: "Job p2", startedAt: "Today", state: "completed" as const }],
        page: 3,
        pageSize: 1,
        total: 2,
      });
    render(
      <OperationalJobsPanel
        adapter={{ list, run: { execute: vi.fn().mockResolvedValue(undefined) } }}
        pageSize={1}
      />,
    );

    await screen.findByText("Job p1");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Job p2");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Job p3");
    expect(screen.getByText("Page 3 of 3")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Run now" }));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(4));

    await waitFor(() => expect(screen.getByText("Page 2 of 2")).toBeTruthy());
    expect(screen.queryByText("Page 3 of 2")).toBeNull();
    expect(screen.getByText("Job p2")).toBeTruthy();
  });

  it("applies the className prop to the operational panels", async () => {
    render(
      <>
        <BackupsPanel
          className="host-backups"
          adapter={{
            list: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 25, total: 0 }),
          }}
        />
        <OperationalJobsPanel
          className="host-jobs"
          adapter={{
            list: vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 25, total: 0 }),
          }}
        />
        <SettingsPanel
          className="host-settings"
          adapter={{ load: vi.fn().mockResolvedValue([]), save: { execute: vi.fn() } }}
        />
      </>,
    );

    expect(await screen.findByLabelText("Backups")).toHaveProperty(
      "className",
      expect.stringContaining("host-backups"),
    );
    expect(screen.getByLabelText("Operational jobs")).toHaveProperty(
      "className",
      expect.stringContaining("host-jobs"),
    );
    expect(screen.getByLabelText("Settings")).toHaveProperty(
      "className",
      expect.stringContaining("host-settings"),
    );
  });

  it("closes the restore dialog on failure so the alert error is visible", async () => {
    const restore = vi.fn().mockRejectedValue(new Error("Restore denied"));
    render(
      <BackupsPanel
        adapter={{
          list: vi.fn().mockResolvedValue({
            items: [{ id: "b1", label: "Daily", createdAt: "Today", state: "completed" }],
            page: 1,
            pageSize: 25,
            total: 1,
          }),
          restore: { execute: restore },
        }}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Restore" }));
    fireEvent.click(screen.getByRole("button", { name: "Restore backup" }));

    await waitFor(() => expect(restore).toHaveBeenCalledWith({ backupId: "b1" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByRole("alert").textContent).toContain("Restore denied");
  });

  it("ignores a stale settings load response that resolves after the adapter changes", async () => {
    let resolveStale: ((value: unknown) => void) | undefined;
    const staleLoad = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveStale = resolve;
        }),
    );
    const freshLoad = vi
      .fn()
      .mockResolvedValue([{ id: "fresh", label: "Fresh field", value: "42" }]);
    const { rerender } = render(
      <SettingsPanel adapter={{ load: staleLoad, save: { execute: vi.fn() } }} />,
    );
    await waitFor(() => expect(staleLoad).toHaveBeenCalledOnce());

    rerender(<SettingsPanel adapter={{ load: freshLoad, save: { execute: vi.fn() } }} />);
    await screen.findByDisplayValue("42");

    resolveStale?.([{ id: "stale", label: "Stale field", value: "1" }]);
    await waitFor(() => expect(screen.getByDisplayValue("42")).toBeTruthy());
    expect(screen.queryByDisplayValue("1")).toBeNull();
  });

  it("clears stale fields when the adapter changes and the new adapter's load fails", async () => {
    const { rerender } = render(
      <SettingsPanel
        adapter={{
          load: vi.fn().mockResolvedValue([{ id: "first", label: "First field", value: "hello" }]),
          save: { execute: vi.fn() },
        }}
      />,
    );
    await screen.findByDisplayValue("hello");

    rerender(
      <SettingsPanel
        adapter={{
          load: vi.fn().mockRejectedValue(new Error("Settings host unavailable")),
          save: { execute: vi.fn() },
        }}
      />,
    );

    await screen.findByText("Settings host unavailable");
    expect(screen.queryByDisplayValue("hello")).toBeNull();
  });
});
