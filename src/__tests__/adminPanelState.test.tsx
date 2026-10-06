// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AdminPanelStateView } from "../react";

afterEach(cleanup);

describe("AdminPanelStateView loading", () => {
  it("keeps the plain label output when no skeleton is requested", () => {
    const { container } = render(<AdminPanelStateView state={{ kind: "loading" }} />);
    expect(container.innerHTML).toBe('<p aria-live="polite" class="admin-kit__state">Loading…</p>');
  });

  it("treats zero skeleton rows as no skeleton", () => {
    const { container } = render(
      <AdminPanelStateView state={{ kind: "loading", skeletonRows: 0 }} />,
    );
    expect(container.querySelector(".admin-kit__skeleton")).toBeNull();
  });

  it("renders aria-hidden placeholder bars and keeps the label for screen readers", () => {
    const { container } = render(
      <AdminPanelStateView
        state={{ kind: "loading", label: "Loading users…", skeletonRows: 4 }}
        className="host"
      />,
    );
    const bars = container.querySelectorAll(".admin-kit__skeleton-bar");
    expect(bars).toHaveLength(4);
    for (const bar of Array.from(bars)) expect(bar.getAttribute("aria-hidden")).toBe("true");
    const live = container.querySelector("[aria-live=polite]")!;
    expect(live.className).toBe("admin-kit__state admin-kit__skeleton host");
    expect(screen.getByText("Loading users…").className).toBe("admin-kit__visually-hidden");
  });

  it("caps the number of bars", () => {
    const { container } = render(
      <AdminPanelStateView state={{ kind: "loading", skeletonRows: 500 }} />,
    );
    expect(container.querySelectorAll(".admin-kit__skeleton-bar")).toHaveLength(12);
  });
});
