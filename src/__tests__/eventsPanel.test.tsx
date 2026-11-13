// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatAdminTimestamp } from "../core";
import { EventsPanel } from "../react";

afterEach(cleanup);

const page = {
  items: [
    {
      id: "event-1",
      occurredAt: "2026-07-13T00:00:00.000Z",
      category: "security",
      action: "SIGN_IN",
      message: "Sign-in succeeded",
      severity: "info" as const,
      outcome: "success" as const,
      actor: { label: "Ada" },
      metadata: { ip: "127.0.0.1" },
    },
  ],
  page: 1,
  pageSize: 1,
  total: 2,
  source: { label: "Security audit log", updatedAt: "2026-07-13T00:01:00.000Z" },
};

describe("EventsPanel", () => {
  it("keeps the page header and controls mounted while loading", () => {
    render(
      <EventsPanel
        adapter={{ list: () => new Promise(() => undefined) }}
        headerPresentation="page"
        search={{ placeholder: "Search events" }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Administrative events", level: 1 })).toBeTruthy();
    expect(screen.getByRole("searchbox")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeTruthy();
    expect(screen.getByText("Loading administrative events…")).toBeTruthy();
  });

  it("composes route title, search, and refresh in one page header", async () => {
    const list = vi.fn().mockResolvedValue(page);
    const { container } = render(
      <EventsPanel
        adapter={{ list }}
        headerPresentation="page"
        search={{ placeholder: "Search events" }}
      />,
    );

    await screen.findByText("Sign-in succeeded");
    const header = container.querySelector(".admin-kit__panel-header--page");
    expect(header).toBeTruthy();
    expect(header?.querySelector("h1")?.textContent).toBe("Administrative events");
    expect(header?.querySelector("input[type='search']")).toBeTruthy();
    expect(header?.querySelector("button")?.textContent).toBe("Refresh");
    expect(container.querySelector(".admin-kit__events-filters input[type='search']")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Administrative events", level: 2 })).toBeNull();
  });

  // Five sequential interaction/waitFor cycles (search debounce, category,
  // details, paging, refresh) legitimately run close to vitest's 5s default
  // in jsdom; give the full journey explicit headroom.
  it(
    "declares host-supported filtering, details, refresh, and paging",
    { timeout: 15_000 },
    async () => {
      const list = vi.fn().mockResolvedValue(page);
      render(
        <EventsPanel
          adapter={{
            list,
            categories: [{ value: "security", label: "Security" }],
            outcomes: [{ value: "success", label: "Succeeded" }],
          }}
          search={{ placeholder: "Search events" }}
          pageSize={1}
        />,
      );
      await screen.findByText("Sign-in succeeded");
      const formattedUpdatedAt = formatAdminTimestamp(page.source.updatedAt);
      expect(
        screen.getByText(`Source: Security audit log · updated ${formattedUpdatedAt}`),
      ).toBeTruthy();
      expect(screen.queryByText(/2026-07-13T00:01:00\.000Z/)).toBeNull();
      fireEvent.change(screen.getByPlaceholderText("Search events"), { target: { value: "Ada" } });
      await waitFor(() =>
        expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ search: "Ada", page: 1 })),
      );
      fireEvent.change(screen.getByLabelText("Category"), { target: { value: "security" } });
      await waitFor(() =>
        expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ category: "security" })),
      );
      fireEvent.click(screen.getByText("Details"));
      expect(screen.getByText("127.0.0.1")).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      await waitFor(() =>
        expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })),
      );
      fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
      await waitFor(() => expect(list).toHaveBeenCalledTimes(5));
    },
  );

  it("formats occurredAt for display and lets a host-supplied formatTimestamp override it", async () => {
    const list = vi.fn().mockResolvedValue(page);
    render(<EventsPanel adapter={{ list }} formatTimestamp={(iso) => `stamp:${iso}`} />);
    await screen.findByText("Sign-in succeeded");
    expect(screen.getByText(/stamp:2026-07-13T00:00:00\.000Z/)).toBeTruthy();
    expect(screen.getByText(/stamp:2026-07-13T00:01:00\.000Z/)).toBeTruthy();
  });

  it("offers a scan-first semantic table presentation", async () => {
    render(
      <EventsPanel adapter={{ list: vi.fn().mockResolvedValue(page) }} presentation="table" />,
    );

    await screen.findByRole("table");
    expect(screen.getByRole("columnheader", { name: "Occurred" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Outcome" })).toBeTruthy();
    expect(screen.getByText("Ada")).toBeTruthy();
    expect(screen.getByText("success")).toBeTruthy();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("shows the full event record in an expandable row and resizable columns", async () => {
    window.localStorage.clear();
    render(
      <EventsPanel
        adapter={{ list: vi.fn().mockResolvedValue(page) }}
        presentation="table"
        storageKey="audit"
      />,
    );
    await screen.findByRole("table");
    expect(screen.getByRole("separator", { name: "Resize Occurred column" })).toBeTruthy();
    expect(screen.queryByRole("separator", { name: "Resize Event column" })).toBeNull();
    expect(screen.getByText("Sign-in succeeded").closest("td")?.getAttribute("title")).toBe(
      "SIGN_IN\nSign-in succeeded",
    );
    const time = document.querySelector("time.admin-kit__event-time");
    expect(time?.getAttribute("dateTime")).toBe("2026-07-13T00:00:00.000Z");
    expect(time?.querySelector("small")?.textContent).toMatch(/ago|yesterday|last|next|in /);

    fireEvent.click(screen.getByRole("button", { name: /View details for SIGN_IN/ }));
    const details = document.querySelector(".admin-kit__event-details");
    expect(details?.textContent).toContain("Sign-in succeeded");
    expect(details?.textContent).toContain("127.0.0.1");

    fireEvent.keyDown(screen.getByRole("separator", { name: "Resize Actor column" }), {
      key: "ArrowRight",
    });
    expect(JSON.parse(window.localStorage.getItem("admin-kit:table-widths:audit")!)).toEqual({
      actor: 184,
    });
  });

  it("renders retryable errors without stale event content", async () => {
    const list = vi.fn().mockRejectedValue(new Error("Audit source unavailable"));
    render(<EventsPanel adapter={{ list }} headerPresentation="page" />);
    await screen.findByText("Audit source unavailable");
    expect(screen.getByRole("heading", { name: "Administrative events", level: 1 })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
  });

  it("keeps the latest query's results when an earlier request resolves last", async () => {
    let resolveStale: ((value: typeof page) => void) | undefined;
    const initialResult = {
      ...page,
      items: [{ ...page.items[0], id: "event-initial", message: "Initial load" }],
    };
    const staleResult = {
      ...page,
      items: [{ ...page.items[0], id: "event-stale", message: "Stale match for e" }],
    };
    const freshResult = {
      ...page,
      items: [{ ...page.items[0], id: "event-fresh", message: "Fresh match for err" }],
    };
    const list = vi
      .fn()
      .mockResolvedValueOnce(initialResult)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveStale = resolve;
          }),
      )
      .mockResolvedValueOnce(freshResult);

    render(
      <EventsPanel adapter={{ list }} search={{ placeholder: "Search events" }} pageSize={1} />,
    );
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
    render(
      <EventsPanel adapter={{ list }} search={{ placeholder: "Search events" }} pageSize={1} />,
    );
    await waitFor(() => expect(list).toHaveBeenCalledTimes(1));

    const input = screen.getByPlaceholderText("Search events");
    fireEvent.change(input, { target: { value: "e" } });
    fireEvent.change(input, { target: { value: "er" } });
    fireEvent.change(input, { target: { value: "err" } });

    await waitFor(
      () => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ search: "err" })),
      { timeout: 1000 },
    );
    // Only one additional adapter call for three keystrokes.
    expect(list).toHaveBeenCalledTimes(2);
  });
  it("renders only the requested columns in the table presentation", async () => {
    const { container } = render(
      <EventsPanel
        adapter={{ list: vi.fn().mockResolvedValue(page) }}
        columns={["occurred", "event", "outcome"]}
        presentation="table"
      />,
    );
    await screen.findByText("Sign-in succeeded");
    const headers = Array.from(container.querySelectorAll("th")).map((th) => th.textContent);
    expect(headers).toEqual(["Occurred", "Event", "Outcome", "Details"]);
    expect(container.querySelectorAll("tbody tr:first-child td")).toHaveLength(4);
    expect(screen.queryByText("Ada")).toBeNull();
    const labels = Array.from(
      container.querySelectorAll("tbody tr:first-child .admin-kit__mobile-cell-label"),
    ).map((label) => label.textContent);
    expect(labels).toEqual(["Occurred", "Event", "Outcome", "Details"]);
  });

  it("renders every column by default", async () => {
    const { container } = render(
      <EventsPanel adapter={{ list: vi.fn().mockResolvedValue(page) }} presentation="table" />,
    );
    await screen.findByText("Sign-in succeeded");
    expect(Array.from(container.querySelectorAll("th")).map((th) => th.textContent)).toEqual([
      "Occurred",
      "Event",
      "Actor",
      "Resource",
      "Outcome",
      "Details",
    ]);
  });

  it("applies columns to the feed presentation", async () => {
    render(
      <EventsPanel
        adapter={{ list: vi.fn().mockResolvedValue(page) }}
        columns={["event", "actor"]}
      />,
    );
    await screen.findByText("Sign-in succeeded");
    expect(screen.getByText(/actor: Ada/)).toBeTruthy();
    expect(screen.getByText("security · info")).toBeTruthy();
  });

  it("renders a custom empty state instead of the default", async () => {
    const empty = { ...page, items: [], total: 0 };
    render(
      <EventsPanel
        adapter={{ list: vi.fn().mockResolvedValue(empty) }}
        emptyState={<p>Nothing has happened yet.</p>}
      />,
    );
    await screen.findByText("Nothing has happened yet.");
    expect(screen.queryByText("No administrative events found.")).toBeNull();
  });

  it("keeps the default empty state when none is supplied", async () => {
    const empty = { ...page, items: [], total: 0 };
    render(<EventsPanel adapter={{ list: vi.fn().mockResolvedValue(empty) }} />);
    await screen.findByText("No administrative events found.");
  });

  describe("table text (K4)", () => {
    const requestEvent = {
      ...page.items[0],
      id: "event-request",
      action: "POST",
      message: "POST /api/projects/CAIRN/tickets/cmp9x3q0e0001abcdefghijkl returned 502",
      resource: { label: "/api/projects/CAIRN/tickets/cmp9x3q0e0001abcdefghijkl" },
      metadata: { status: "502" },
    };
    const requestPage = { ...page, items: [requestEvent], total: 1 };

    it("prints the request path once, in full, in the Resource cell", async () => {
      render(
        <EventsPanel
          adapter={{ list: vi.fn().mockResolvedValue(requestPage) }}
          presentation="table"
        />,
      );
      await screen.findByRole("table");
      const body = document.querySelector("tbody")!;
      const eventCell = body.querySelectorAll("tr:first-child .admin-kit__cell-value")[1];
      expect(eventCell.textContent).toBe("POSTreturned 502");
      expect(eventCell.textContent).not.toContain("/api/projects");
      const resource = body.querySelector(".admin-kit__events-resource")!;
      expect(resource.textContent).toBe(requestEvent.resource.label);
      expect(resource.closest("td")?.getAttribute("title")).toBe(requestEvent.resource.label);
      expect(body.textContent?.split("/api/projects/CAIRN").length).toBe(2);
    });

    it.each(["approved", "", "42", "600", "5.5"])(
      "shows the message, not 'returned', for a non-HTTP status %j",
      async (status) => {
        const list = vi
          .fn()
          .mockResolvedValue({ ...page, items: [{ ...page.items[0], metadata: { status } }] });
        render(<EventsPanel adapter={{ list }} presentation="table" />);
        await screen.findByRole("table");
        expect(screen.getByText("Sign-in succeeded")).toBeTruthy();
        expect(screen.queryByText(/^returned/)).toBeNull();
      },
    );

    it("keeps showing the message when the event carries no status", async () => {
      render(
        <EventsPanel adapter={{ list: vi.fn().mockResolvedValue(page) }} presentation="table" />,
      );
      await screen.findByRole("table");
      expect(screen.getByText("Sign-in succeeded")).toBeTruthy();
    });
  });

  describe("collapsible header", () => {
    const filtered = {
      severities: [
        { value: "info", label: "Info" },
        { value: "error", label: "Error (5xx)" },
      ],
      outcomes: [{ value: "failure", label: "Failure" }],
    };
    const toggle = () => screen.getByRole("button", { name: /controls/ });

    beforeEach(() => window.localStorage.clear());

    it("moves search and filters into the collapsible region and Refresh into the title row", async () => {
      const { container } = render(
        <EventsPanel
          adapter={{ list: vi.fn().mockResolvedValue(page), ...filtered }}
          headerCollapsible={{ storageKey: "events" }}
          headerPresentation="page"
          search={{ placeholder: "Search events" }}
        />,
      );
      await screen.findByText("Sign-in succeeded");
      const region = container.querySelector<HTMLElement>(".admin-kit__panel-header-region")!;
      expect(region.querySelector("input[type='search']")).toBeTruthy();
      expect(region.querySelector("select")).toBeTruthy();
      expect(region.querySelector("button")).toBeNull();
      expect(container.querySelector(".admin-kit__panel-header-actions")?.textContent).toBe(
        "Refresh",
      );
      fireEvent.click(toggle());
      expect(region.hidden).toBe(true);
      expect(screen.getByText("2 events")).toBeTruthy();
    });

    it("keeps applied filters as removable chips while collapsed", async () => {
      const list = vi.fn().mockResolvedValue(page);
      render(
        <EventsPanel
          adapter={{ list, ...filtered }}
          headerCollapsible={{ storageKey: "events-chips" }}
        />,
      );
      await screen.findByText("Sign-in succeeded");
      fireEvent.change(screen.getByLabelText("Severity"), { target: { value: "error" } });
      fireEvent.change(screen.getByLabelText("Outcome"), { target: { value: "failure" } });
      await waitFor(() =>
        expect(list).toHaveBeenLastCalledWith(
          expect.objectContaining({ severity: "error", outcome: "failure" }),
        ),
      );
      fireEvent.click(toggle());
      expect(screen.getByRole("button", { name: "Show controls, 2 filters applied" })).toBeTruthy();
      expect(screen.getByText("Severity: Error (5xx)")).toBeTruthy();
      expect(screen.getByText("Outcome: Failure")).toBeTruthy();

      fireEvent.click(screen.getByRole("button", { name: "Remove filter: Severity: Error (5xx)" }));
      await waitFor(() =>
        expect(list).toHaveBeenLastCalledWith(
          expect.objectContaining({ severity: undefined, outcome: "failure" }),
        ),
      );
      expect(screen.queryByText("Severity: Error (5xx)")).toBeNull();
      expect(screen.getByText("Outcome: Failure")).toBeTruthy();
      expect(document.activeElement).toBe(toggle());
      expect(toggle().getAttribute("aria-expanded")).toBe("false");
    });

    it("shows a search as a chip and clears the field when the chip is removed", async () => {
      const list = vi.fn().mockResolvedValue(page);
      render(
        <EventsPanel
          adapter={{ list }}
          headerCollapsible={{ storageKey: "events-search" }}
          search={{ placeholder: "Search events" }}
        />,
      );
      await screen.findByText("Sign-in succeeded");
      fireEvent.change(screen.getByPlaceholderText("Search events"), { target: { value: "Ada" } });
      await waitFor(() =>
        expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ search: "Ada" })),
      );
      fireEvent.click(toggle());
      fireEvent.click(screen.getByRole("button", { name: "Remove filter: Search: Ada" }));
      await waitFor(() =>
        expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ search: undefined })),
      );
      fireEvent.click(toggle());
      expect((screen.getByPlaceholderText("Search events") as HTMLInputElement).value).toBe("");
    });

    it("groups thousands in the default collapsed summary", async () => {
      const list = vi.fn().mockResolvedValue({ ...page, total: 48213 });
      render(
        <EventsPanel
          adapter={{ list }}
          headerCollapsible={{ storageKey: "events-total", defaultCollapsed: true }}
        />,
      );
      await screen.findByText("Sign-in succeeded");
      expect(screen.getByText(`${(48213).toLocaleString()} events`)).toBeTruthy();
    });

    it("lets the host replace the collapsed summary and add its own applied filters", async () => {
      render(
        <EventsPanel
          adapter={{ list: vi.fn().mockResolvedValue(page) }}
          headerCollapsible={{
            storageKey: "events-host",
            activeCount: 1,
            defaultCollapsed: true,
            renderCollapsedSummary: ({ total, chips }) => (
              <>
                <span>{total} requests</span>
                {chips}
              </>
            ),
          }}
        />,
      );
      await screen.findByText("Sign-in succeeded");
      expect(screen.getByText("2 requests")).toBeTruthy();
      expect(toggle().textContent).toContain("(1)");
    });
  });
});
