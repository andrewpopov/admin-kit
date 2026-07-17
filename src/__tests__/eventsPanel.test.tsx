// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatAdminTimestamp } from "../core";
import { EventsPanel } from "../react";

afterEach(cleanup);

const page = {
  items: [{ id: "event-1", occurredAt: "2026-07-13T00:00:00.000Z", category: "security", action: "SIGN_IN", message: "Sign-in succeeded", severity: "info" as const, outcome: "success" as const, actor: { label: "Ada" }, metadata: { ip: "127.0.0.1" } }],
  page: 1, pageSize: 1, total: 2, source: { label: "Security audit log", updatedAt: "2026-07-13T00:01:00.000Z" },
};

describe("EventsPanel", () => {
  // Five sequential interaction/waitFor cycles (search debounce, category,
  // details, paging, refresh) legitimately run close to vitest's 5s default
  // in jsdom; give the full journey explicit headroom.
  it("declares host-supported filtering, details, refresh, and paging", { timeout: 15_000 }, async () => {
    const list = vi.fn().mockResolvedValue(page);
    render(<EventsPanel adapter={{ list, categories: [{ value: "security", label: "Security" }], outcomes: [{ value: "success", label: "Succeeded" }] }} search={{ placeholder: "Search events" }} pageSize={1} />);
    await screen.findByText("Sign-in succeeded");
    const formattedUpdatedAt = formatAdminTimestamp(page.source.updatedAt);
    expect(screen.getByText(`Source: Security audit log · updated ${formattedUpdatedAt}`)).toBeTruthy();
    expect(screen.queryByText(/2026-07-13T00:01:00\.000Z/)).toBeNull();
    fireEvent.change(screen.getByPlaceholderText("Search events"), { target: { value: "Ada" } });
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ search: "Ada", page: 1 })));
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "security" } });
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ category: "security" })));
    fireEvent.click(screen.getByText("Details"));
    expect(screen.getByText("127.0.0.1")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(5));
  });

  it("formats occurredAt for display and lets a host-supplied formatTimestamp override it", async () => {
    const list = vi.fn().mockResolvedValue(page);
    render(<EventsPanel adapter={{ list }} formatTimestamp={(iso) => `stamp:${iso}`} />);
    await screen.findByText("Sign-in succeeded");
    expect(screen.getByText(/stamp:2026-07-13T00:00:00\.000Z/)).toBeTruthy();
    expect(screen.getByText(/stamp:2026-07-13T00:01:00\.000Z/)).toBeTruthy();
  });

  it("offers a scan-first semantic table presentation", async () => {
    render(<EventsPanel adapter={{ list: vi.fn().mockResolvedValue(page) }} presentation="table" />);

    await screen.findByRole("table");
    expect(screen.getByRole("columnheader", { name: "Occurred" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Outcome" })).toBeTruthy();
    expect(screen.getByText("Ada")).toBeTruthy();
    expect(screen.getByText("success")).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("renders retryable errors without stale event content", async () => {
    const list = vi.fn().mockRejectedValue(new Error("Audit source unavailable"));
    render(<EventsPanel adapter={{ list }} />);
    await screen.findByText("Audit source unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
  });

  it("keeps the latest query's results when an earlier request resolves last", async () => {
    let resolveStale: ((value: typeof page) => void) | undefined;
    const initialResult = { ...page, items: [{ ...page.items[0], id: "event-initial", message: "Initial load" }] };
    const staleResult = { ...page, items: [{ ...page.items[0], id: "event-stale", message: "Stale match for e" }] };
    const freshResult = { ...page, items: [{ ...page.items[0], id: "event-fresh", message: "Fresh match for err" }] };
    const list = vi.fn()
      .mockResolvedValueOnce(initialResult)
      .mockImplementationOnce(() => new Promise((resolve) => { resolveStale = resolve; }))
      .mockResolvedValueOnce(freshResult);

    render(<EventsPanel adapter={{ list }} search={{ placeholder: "Search events" }} pageSize={1} />);
    await screen.findByText("Initial load");

    const input = screen.getByPlaceholderText("Search events");
    // Types "e" (slow, pending) then "err" (fast, resolves first).
    fireEvent.change(input, { target: { value: "e" } });
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2), { timeout: 1000 });
    fireEvent.change(input, { target: { value: "err" } });
    await waitFor(() => expect(list).toHaveBeenCalledTimes(3), { timeout: 1000 });

    await screen.findByText("Fresh match for err");

    // The stale "e" request now resolves after the newer "err" request already landed.
    resolveStale?.(staleResult);

    await waitFor(() => expect(screen.getByText("Fresh match for err")).toBeTruthy());
    expect(screen.queryByText("Stale match for e")).toBeNull();
  });

  it("debounces search input so keystrokes don't each trigger a request", async () => {
    const list = vi.fn().mockResolvedValue(page);
    render(<EventsPanel adapter={{ list }} search={{ placeholder: "Search events" }} pageSize={1} />);
    await waitFor(() => expect(list).toHaveBeenCalledTimes(1));

    const input = screen.getByPlaceholderText("Search events");
    fireEvent.change(input, { target: { value: "e" } });
    fireEvent.change(input, { target: { value: "er" } });
    fireEvent.change(input, { target: { value: "err" } });

    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ search: "err" })), { timeout: 1000 });
    // Only one additional adapter call for three keystrokes.
    expect(list).toHaveBeenCalledTimes(2);
  });
});
