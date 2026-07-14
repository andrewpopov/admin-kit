// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventsPanel } from "../react";

afterEach(cleanup);

const page = {
  items: [{ id: "event-1", occurredAt: "2026-07-13T00:00:00.000Z", category: "security", action: "SIGN_IN", message: "Sign-in succeeded", severity: "info" as const, outcome: "success" as const, actor: { label: "Ada" }, metadata: { ip: "127.0.0.1" } }],
  page: 1, pageSize: 1, total: 2, source: { label: "Security audit log", updatedAt: "2026-07-13T00:01:00.000Z" },
};

describe("EventsPanel", () => {
  it("declares host-supported filtering, details, refresh, and paging", async () => {
    const list = vi.fn().mockResolvedValue(page);
    render(<EventsPanel adapter={{ list, categories: [{ value: "security", label: "Security" }], outcomes: [{ value: "success", label: "Succeeded" }] }} search={{ placeholder: "Search events" }} pageSize={1} />);
    await screen.findByText("Sign-in succeeded");
    expect(screen.getByText("Source: Security audit log · updated 2026-07-13T00:01:00.000Z")).toBeTruthy();
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

  it("renders retryable errors without stale event content", async () => {
    const list = vi.fn().mockRejectedValue(new Error("Audit source unavailable"));
    render(<EventsPanel adapter={{ list }} />);
    await screen.findByText("Audit source unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
  });
});
