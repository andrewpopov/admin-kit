// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminFilterChip, AdminPanelHeader, AdminWorkspace } from "../react";
import { resolveBandCollapsed } from "../react/adminPanelBand";

const REM = 16;
const viewportListeners = new Set<() => void>();
let viewport = { width: 1280, height: 800 };

function setViewport(width: number, height: number) {
  viewport = { width, height };
  act(() => viewportListeners.forEach((notify) => notify()));
}

beforeEach(() => {
  window.localStorage.clear();
  viewport = { width: 1280, height: 800 };
  window.matchMedia = ((query: string) => ({
    media: query,
    get matches() {
      return viewport.width <= 63.99 * REM || viewport.height <= 44.99 * REM;
    },
    addEventListener: (_type: string, listener: () => void) => viewportListeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) =>
      viewportListeners.delete(listener),
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  cleanup();
  viewportListeners.clear();
  vi.restoreAllMocks();
  // @ts-expect-error jsdom has no matchMedia; remove the test's stand-in.
  delete window.matchMedia;
});

function Band({
  storageKey = "demo",
  activeCount = 0,
}: {
  storageKey?: string;
  activeCount?: number;
}) {
  return (
    <AdminPanelHeader
      actions={<button type="button">New key</button>}
      collapsible={{
        storageKey,
        activeCount,
        collapsedSummary: <span>12 keys</span>,
      }}
      detail={<p>Service credentials</p>}
      presentation="page"
      summary={<span>Healthy</span>}
      title="API keys"
      toolbar={<input aria-label="Search keys" type="search" />}
    />
  );
}

const toggle = () => screen.getByRole("button", { name: /controls/ });
const region = () => document.querySelector<HTMLElement>(".admin-kit__panel-header-region")!;

describe("collapsible band: default by viewport", () => {
  it.each([
    [1280, 800, false],
    [1024, 768, false],
    [390, 844, true],
    [1280, 600, true],
    [1000, 800, true],
  ])("%ix%i starts collapsed=%s", (width, height, collapsed) => {
    setViewport(width, height);
    render(<Band />);
    expect(toggle().getAttribute("aria-expanded")).toBe(String(!collapsed));
  });

  it("a stored choice beats the default, and an explicit default beats the viewport", () => {
    expect(resolveBandCollapsed("expanded", "auto", "compact")).toBe(false);
    expect(resolveBandCollapsed("collapsed", "auto", "regular")).toBe(true);
    expect(resolveBandCollapsed(undefined, true, "regular")).toBe(true);
    expect(resolveBandCollapsed(undefined, false, "compact")).toBe(false);
    expect(resolveBandCollapsed(undefined, "auto", "compact")).toBe(true);
    expect(resolveBandCollapsed(undefined, "auto", "regular")).toBe(false);
  });
});

describe("collapsible band: toggle semantics", () => {
  it("flips aria-expanded, hides the region, and reads Show controls", () => {
    render(<Band />);
    expect(toggle().textContent).toBe("Hide controls");
    expect(toggle().getAttribute("aria-controls")).toBe(region().id);
    expect(region().hidden).toBe(false);

    fireEvent.click(toggle());

    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(toggle().textContent).toBe("Show controls");
    expect(region().hidden).toBe(true);
  });

  it("collapsed region is hidden and out of the tab order, while title and actions stay", () => {
    render(<Band />);
    expect(screen.getByRole("searchbox", { name: "Search keys" })).toBeTruthy();
    fireEvent.click(toggle());
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(screen.getByRole("heading", { name: "API keys" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "New key" })).toBeTruthy();
  });

  it("keeps focus on the toggle through a toggle", () => {
    render(<Band />);
    toggle().focus();
    fireEvent.click(toggle());
    expect(document.activeElement).toBe(toggle());
    fireEvent.click(toggle());
    expect(document.activeElement).toBe(toggle());
  });

  it("shows the summary line only while collapsed", () => {
    render(<Band />);
    expect(screen.queryByText("12 keys")).toBeNull();
    fireEvent.click(toggle());
    expect(screen.getByText("12 keys")).toBeTruthy();
  });

  it("counts applied filters in the collapsed label and its accessible name", () => {
    render(<Band activeCount={2} />);
    expect(toggle().textContent).toBe("Hide controls");
    fireEvent.click(toggle());
    expect(toggle().textContent).toContain("(2)");
    expect(screen.getByRole("button", { name: "Show controls, 2 filters applied" })).toBeTruthy();
  });

  it("renders no toggle when there is nothing to collapse", () => {
    render(
      <AdminPanelHeader
        collapsible={{ storageKey: "empty", collapsedSummary: null }}
        title="Nothing"
      />,
    );
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("returns focus to the toggle when a chip in the collapsed summary is removed", () => {
    const onRemove = vi.fn();
    render(
      <AdminPanelHeader
        collapsible={{
          storageKey: "chips",
          defaultCollapsed: true,
          activeCount: 1,
          collapsedSummary: <AdminFilterChip label="Status: Failed" onRemove={onRemove} />,
        }}
        title="Deliveries"
        toolbar={<input aria-label="Search" />}
      />,
    );
    const remove = screen.getByRole("button", { name: "Remove filter: Status: Failed" });
    remove.focus();
    fireEvent.click(remove);
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(toggle());
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
  });

  it("routes an AdminWorkspace's description, summary and toolbar through the same band", () => {
    render(
      <AdminWorkspace
        collapsible={{ storageKey: "ws", collapsedSummary: <span>3 tiles</span> }}
        description="Policy"
        summary={<span>Tiles</span>}
        title="Retention"
        toolbar={<input aria-label="Filter" />}
      >
        Body
      </AdminWorkspace>,
    );
    expect(region().textContent).toContain("Policy");
    expect(region().textContent).toContain("Tiles");
    fireEvent.click(toggle());
    expect(screen.queryByRole("textbox", { name: "Filter" })).toBeNull();
    expect(screen.getByText("3 tiles")).toBeTruthy();
  });
});

describe("collapsible band: persistence", () => {
  it("writes the choice under the page and width class, and restores it on remount", () => {
    const first = render(<Band />);
    fireEvent.click(toggle());
    expect(window.localStorage.getItem("admin-kit:header:demo:regular")).toBe("collapsed");
    first.unmount();

    render(<Band />);
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle());
    expect(window.localStorage.getItem("admin-kit:header:demo:regular")).toBe("expanded");
  });

  it("keeps a separate choice per width class", () => {
    render(<Band />);
    fireEvent.click(toggle());
    expect(toggle().getAttribute("aria-expanded")).toBe("false");

    setViewport(390, 844);
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle());
    expect(window.localStorage.getItem("admin-kit:header:demo:compact")).toBe("expanded");
    expect(window.localStorage.getItem("admin-kit:header:demo:regular")).toBe("collapsed");

    setViewport(1280, 800);
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
  });

  it("starts from the compact default when only the regular class was chosen", () => {
    window.localStorage.setItem("admin-kit:header:demo:regular", "expanded");
    setViewport(390, 844);
    render(<Band />);
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
  });

  it("separates pages by storage key", () => {
    window.localStorage.setItem("admin-kit:header:other:regular", "collapsed");
    render(<Band storageKey="demo" />);
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
  });

  it("ignores a stored value it does not recognise", () => {
    window.localStorage.setItem("admin-kit:header:demo:regular", "sideways");
    render(<Band />);
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
  });

  it("keeps toggling for the visit when storage throws on read and write", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    render(<Band storageKey="blocked" />);
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(toggle());
    expect(toggle().getAttribute("aria-expanded")).toBe("false");
    expect(region().hidden).toBe(true);
    fireEvent.click(toggle());
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
  });

  it("keeps two bands on the same key in step", () => {
    render(
      <>
        <Band storageKey="shared" />
        <Band storageKey="shared" />
      </>,
    );
    fireEvent.click(screen.getAllByRole("button", { name: /controls/ })[0]);
    expect(screen.getAllByRole("button", { name: /controls/ }).map((b) => b.textContent)).toEqual([
      "Show controls",
      "Show controls",
    ]);
  });
});
