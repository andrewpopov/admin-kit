// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
    fireEvent.click(screen.getByRole("checkbox", { name: /Set New checkout on/ }));

    await screen.findByText("Toggle denied");
    expect(screen.getByRole("alert").textContent).toBe("Toggle denied");
    expect(screen.getByText("New checkout")).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: /Set New checkout on/ })).toBeTruthy();
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
});
