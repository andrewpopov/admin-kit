// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineAdminLogsAdapter, validateAdminLogsSnapshot } from "../core";
import { LogsPanel } from "../react";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const snapshot = {
  source: "app",
  sources: [
    { value: "app", label: "Application", detail: "app.log" },
    { value: "pm2", label: "PM2" },
  ],
  entries: [
    {
      id: "1",
      timestamp: "2026-07-14T20:00:00.000Z",
      level: { value: "info", label: "INFO", tone: "info" as const },
      category: "http",
      message: "Request completed",
      raw: "INFO Request completed",
    },
    {
      id: "2",
      timestamp: "2026-07-14T20:01:00.000Z",
      level: { value: "error", label: "ERROR", tone: "danger" as const },
      category: "worker",
      message: "Worker failed",
      raw: "ERROR Worker failed",
    },
  ],
  total: 2,
  levels: [
    { value: "info", label: "Info" },
    { value: "error", label: "Error" },
  ],
  categories: [
    { value: "http", label: "HTTP" },
    { value: "worker", label: "Worker" },
  ],
};

function adapter(read = vi.fn().mockResolvedValue(snapshot)) {
  return defineAdminLogsAdapter({
    read,
    defaultSource: "app",
    lineLimits: [100, 200],
    defaultLineLimit: 200,
  });
}

describe("runtime log contracts", () => {
  it("validates and freezes a three-host normalized snapshot", () => {
    const result = validateAdminLogsSnapshot(snapshot);
    expect(result.source).toBe("app");
    expect(Object.isFrozen(result.entries)).toBe(true);
    expect(Object.isFrozen(result.entries[0]?.level)).toBe(true);
  });

  it("rejects undeclared sources and levels before rendering", () => {
    expect(() => validateAdminLogsSnapshot({ ...snapshot, source: "missing" })).toThrow(
      /not declared/i,
    );
    expect(() =>
      validateAdminLogsSnapshot({
        ...snapshot,
        entries: [{ ...snapshot.entries[0]!, level: { value: "fatal", label: "Fatal" } }],
      }),
    ).toThrow(/undeclared level/i);
  });

  it("represents a host with no runtime log sources as an empty snapshot", () => {
    const result = validateAdminLogsSnapshot({ source: null, sources: [], entries: [], total: 0 });
    expect(result.source).toBeNull();
    expect(() =>
      validateAdminLogsSnapshot({ source: "missing", sources: [], entries: [], total: 0 }),
    ).toThrow(/without sources/i);
  });

  it("rejects invalid line-limit configuration", () => {
    expect(() => defineAdminLogsAdapter({ read: vi.fn(), lineLimits: [200, 200] })).toThrow(
      /unique/i,
    );
    expect(() =>
      defineAdminLogsAdapter({ read: vi.fn(), lineLimits: [100], defaultLineLimit: 200 }),
    ).toThrow(/must be declared/i);
  });
});

describe("LogsPanel", () => {
  it("renders normalized sources, filters, bounded lines, and console output", async () => {
    const read = vi.fn().mockResolvedValue(snapshot);
    render(<LogsPanel adapter={adapter(read)} />);

    expect(await screen.findByText("Request completed")).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Source" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Level" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Category" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Lines" })).toHaveProperty("value", "200");
    expect(read).toHaveBeenCalledWith({
      source: "app",
      limit: 200,
      level: undefined,
      category: undefined,
      search: undefined,
    });
  });

  it("filters the loaded snapshot immediately and applies search to the adapter", async () => {
    const read = vi.fn().mockResolvedValue(snapshot);
    render(<LogsPanel adapter={adapter(read)} />);
    await screen.findByText("Request completed");

    fireEvent.change(screen.getByRole("searchbox", { name: "Search logs" }), {
      target: { value: "worker" },
    });
    expect(screen.queryByText("Request completed")).toBeNull();
    expect(screen.getByText("Worker failed")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() =>
      expect(read).toHaveBeenLastCalledWith(expect.objectContaining({ search: "worker" })),
    );
  });

  it("keeps the last snapshot visible when refresh fails", async () => {
    const read = vi
      .fn()
      .mockResolvedValueOnce(snapshot)
      .mockRejectedValueOnce(new Error("Log host unavailable"));
    render(<LogsPanel adapter={adapter(read)} />);
    await screen.findByText("Request completed");

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(await screen.findByText("Log host unavailable")).toBeTruthy();
    expect(
      screen.getByText("Refresh failed. The previously loaded output remains available."),
    ).toBeTruthy();
    expect(screen.getByText("Request completed")).toBeTruthy();
  });

  it("starts in tail-follow mode and exposes a named keyboard scroll region", async () => {
    render(<LogsPanel adapter={adapter()} />);
    await screen.findByText("Request completed");

    const output = screen.getByRole("region", { name: "Runtime logs output" });
    expect(output).toHaveProperty("tabIndex", 0);
    expect(
      screen.getByRole("switch", { name: "Follow latest on" }).getAttribute("aria-checked"),
    ).toBe("true");
    fireEvent.click(screen.getByRole("switch", { name: "Follow latest on" }));
    expect(
      screen.getByRole("switch", { name: "Follow latest off" }).getAttribute("aria-checked"),
    ).toBe("false");
  });

  it("announces a manual refresh without remounting unchanged log rows", async () => {
    const read = vi.fn().mockResolvedValue(snapshot);
    render(<LogsPanel adapter={adapter(read)} />);
    const entry = await screen.findByText("Request completed");

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(await screen.findByText("Refreshed: 0 new log lines.")).toBeTruthy();
    expect(screen.getByText("Request completed")).toBe(entry);
  });

  it("ignores a stale source response that resolves after the current source", async () => {
    let resolvePm2: ((value: typeof snapshot) => void) | undefined;
    const read = vi
      .fn()
      .mockResolvedValueOnce(snapshot)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolvePm2 = resolve;
          }),
      )
      .mockResolvedValueOnce({
        ...snapshot,
        entries: [{ ...snapshot.entries[0]!, id: "current", message: "Current app line" }],
      });
    render(<LogsPanel adapter={adapter(read)} />);
    await screen.findByText("Request completed");

    fireEvent.change(screen.getByRole("combobox", { name: "Source" }), {
      target: { value: "pm2" },
    });
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    fireEvent.change(screen.getByRole("combobox", { name: "Source" }), {
      target: { value: "app" },
    });
    await screen.findByText("Current app line");
    resolvePm2?.({
      ...snapshot,
      source: "pm2",
      entries: [{ ...snapshot.entries[0]!, id: "stale", message: "Stale PM2 line" }],
    });
    await waitFor(() => expect(screen.getByText("Current app line")).toBeTruthy());
    expect(screen.queryByText("Stale PM2 line")).toBeNull();
  });

  it("reports clipboard failure without hiding output", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("Denied")) },
    });
    render(<LogsPanel adapter={adapter()} />);
    await screen.findByText("Request completed");
    fireEvent.click(screen.getByRole("button", { name: "Copy visible" }));
    expect(await screen.findByText("Unable to copy log output.")).toBeTruthy();
    expect(screen.getByText("Worker failed")).toBeTruthy();
  });

  it("replaces refresh feedback with the later copy outcome", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("Denied")) },
    });
    const read = vi.fn().mockResolvedValue(snapshot);
    render(<LogsPanel adapter={adapter(read)} />);
    await screen.findByText("Request completed");

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await screen.findByText("Refreshed: 0 new log lines.");
    fireEvent.click(screen.getByRole("button", { name: "Copy visible" }));
    expect(await screen.findByText("Unable to copy log output.")).toBeTruthy();
    expect(screen.queryByText("Refreshed: 0 new log lines.")).toBeNull();
  });

  it("exposes optional polling as an accessible user-controlled switch", async () => {
    render(<LogsPanel adapter={adapter()} pollIntervalMs={5_000} />);
    const toggle = await screen.findByRole("switch", { name: "Auto-refresh off" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(toggle);
    expect(
      screen.getByRole("switch", { name: "Auto-refresh on" }).getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("does not enable polling for a non-positive interval", async () => {
    render(<LogsPanel adapter={adapter()} pollIntervalMs={-1} defaultAutoRefresh />);
    await screen.findByText("Request completed");
    expect(screen.queryByRole("switch", { name: /auto-refresh/i })).toBeNull();
  });

  it("does not loop forever when the adapter canonicalizes the requested source", async () => {
    // The adapter always echoes back a different source than requested,
    // simulating a host that canonicalizes non-idempotently. Before the
    // fix, feeding that value back into `source` state re-triggered the
    // load effect on every response.
    const read = vi.fn().mockImplementation(async ({ source }: { source?: string }) => ({
      ...snapshot,
      sources: [...snapshot.sources, { value: "app-canonical", label: "App (canonical)" }],
      source: source === "app" ? "app-canonical" : "app",
    }));
    render(<LogsPanel adapter={adapter(read)} />);

    await screen.findByText("Request completed");
    const callsAfterInitialLoad = read.mock.calls.length;
    // Give any runaway effect loop a chance to fire more requests.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(read.mock.calls.length).toBe(callsAfterInitialLoad);
    // The select must reflect the adapter's canonicalized source, not the
    // requested alias: requesting "app" canonicalizes to "app-canonical".
    expect(screen.getByRole("combobox", { name: "Source" })).toHaveProperty(
      "value",
      "app-canonical",
    );
  });
});
