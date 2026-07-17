// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeatureFlagsPanel } from "../react";

const snapshot = {
  flags: [
    {
      key: "new-checkout",
      label: "New checkout",
      description: "Rolls out the redesigned checkout flow.",
      enabled: false,
      source: "store" as const,
      mutable: true,
    },
  ],
  storeHealth: "healthy" as const,
};

afterEach(cleanup);

describe("FeatureFlagsPanel", () => {
  it("renders flags from a successful load", async () => {
    render(
      <FeatureFlagsPanel
        adapter={{ list: vi.fn().mockResolvedValue(snapshot) }}
      />,
    );

    await screen.findByText("New checkout");
    expect(screen.getByText("healthy")).toBeTruthy();
  });

  it("shows an inline error and keeps the flag list mounted after a rejected toggle", async () => {
    const setEnabled = vi.fn().mockRejectedValue(new Error("Toggle denied"));
    render(
      <FeatureFlagsPanel
        adapter={{ list: vi.fn().mockResolvedValue(snapshot), setEnabled }}
      />,
    );

    await screen.findByText("New checkout");
    fireEvent.click(screen.getByRole("checkbox", { name: "New checkout" }));

    await screen.findByText("Toggle denied");
    expect(screen.getByRole("alert").textContent).toBe("Toggle denied");
    expect(screen.getByText("New checkout")).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "New checkout" })).toBeTruthy();
  });

  it("overrides the heading with the title prop", async () => {
    render(
      <FeatureFlagsPanel
        title="Rollouts"
        adapter={{ list: vi.fn().mockResolvedValue(snapshot) }}
      />,
    );

    await screen.findByRole("heading", { name: "Rollouts" });
    expect(screen.queryByRole("heading", { name: "Feature flags" })).toBeNull();
  });

  it("shows the full error state view when the initial load fails", async () => {
    render(
      <FeatureFlagsPanel
        adapter={{ list: vi.fn().mockRejectedValue(new Error("Flags unavailable")) }}
      />,
    );

    await screen.findByText("Flags unavailable");
    expect(screen.queryByText("New checkout")).toBeNull();
  });

  it("ignores a stale list response that resolves after the adapter changes", async () => {
    let resolveStale: ((value: unknown) => void) | undefined;
    const staleList = vi.fn().mockImplementation(
      () => new Promise((resolve) => { resolveStale = resolve; }),
    );
    const freshSnapshot = {
      ...snapshot,
      flags: [{ ...snapshot.flags[0]!, key: "fresh-flag", label: "Fresh flag" }],
    };
    const freshList = vi.fn().mockResolvedValue(freshSnapshot);
    const { rerender } = render(
      <FeatureFlagsPanel adapter={{ list: staleList }} />,
    );
    await waitFor(() => expect(staleList).toHaveBeenCalledOnce());

    rerender(<FeatureFlagsPanel adapter={{ list: freshList }} />);
    await screen.findByText("Fresh flag");

    resolveStale?.(snapshot);
    await waitFor(() => expect(screen.getByText("Fresh flag")).toBeTruthy());
    expect(screen.queryByText("New checkout")).toBeNull();
  });

  it("drops a setEnabled reload that resolves after the adapter changes", async () => {
    let resolveSetEnabled: (() => void) | undefined;
    const staleSetEnabled = vi.fn().mockImplementation(
      () => new Promise<void>((resolve) => { resolveSetEnabled = resolve; }),
    );
    const staleList = vi.fn().mockResolvedValue(snapshot);
    const freshSnapshot = {
      ...snapshot,
      flags: [{ ...snapshot.flags[0]!, key: "fresh-flag", label: "Fresh flag" }],
    };
    const freshList = vi.fn().mockResolvedValue(freshSnapshot);
    const { rerender } = render(
      <FeatureFlagsPanel adapter={{ list: staleList, setEnabled: staleSetEnabled }} />,
    );
    await screen.findByText("New checkout");
    fireEvent.click(screen.getByRole("checkbox", { name: "New checkout" }));
    await waitFor(() => expect(staleSetEnabled).toHaveBeenCalledOnce());

    rerender(<FeatureFlagsPanel adapter={{ list: freshList, setEnabled: vi.fn() }} />);
    await screen.findByText("Fresh flag");
    const listCallsAfterSwap = staleList.mock.calls.length;

    resolveSetEnabled?.();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(screen.getByText("Fresh flag")).toBeTruthy();
    expect(staleList.mock.calls.length).toBe(listCallsAfterSwap);
  });

  it("clears a stale snapshot when the adapter changes and the new adapter's load fails", async () => {
    const { rerender } = render(
      <FeatureFlagsPanel adapter={{ list: vi.fn().mockResolvedValue(snapshot) }} />,
    );
    await screen.findByText("New checkout");

    rerender(
      <FeatureFlagsPanel
        adapter={{ list: vi.fn().mockRejectedValue(new Error("Flag host unavailable")) }}
      />,
    );

    await screen.findByText("Flag host unavailable");
    expect(screen.queryByText("New checkout")).toBeNull();
  });

  it("gives each flag checkbox a collision-safe id even when keys repeat across panels", async () => {
    const otherSnapshot = {
      ...snapshot,
      flags: [{ ...snapshot.flags[0]! }],
    };
    render(
      <>
        <FeatureFlagsPanel adapter={{ list: vi.fn().mockResolvedValue(snapshot) }} />
        <FeatureFlagsPanel adapter={{ list: vi.fn().mockResolvedValue(otherSnapshot) }} />
      </>,
    );

    const checkboxes = await screen.findAllByRole("checkbox", { name: "New checkout" });
    expect(checkboxes).toHaveLength(2);
    const ids = checkboxes.map((checkbox) => checkbox.id);
    expect(new Set(ids).size).toBe(2);
  });
});
