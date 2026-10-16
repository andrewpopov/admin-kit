// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  AdminApp,
  AdminDialog,
  AdminPortal,
  AdminTheme,
  type AdminAppReactGroup,
  type AdminPortalReactGroup,
} from "../react";

afterEach(cleanup);

const noop = () => undefined;
const graphite = "admin-kit--palette-graphite";

const appGroups: readonly AdminAppReactGroup[] = [
  {
    id: "operations",
    label: "Operations",
    sections: [
      { id: "reports", label: "Reports", capability: "custom:reports", render: () => <p>R</p> },
      { id: "billing", label: "Billing", capability: "custom:billing", render: () => <p>B</p> },
    ],
  },
];

const portalGroups: readonly AdminPortalReactGroup[] = [
  {
    id: "operations",
    label: "Operations",
    sections: [
      { id: "reports", label: "Reports", render: () => <p>Reports</p> },
      { id: "billing", label: "Billing", render: () => <p>Billing</p> },
    ],
  },
];

describe("the graphite palette is opt-in", () => {
  it("leaves a default AdminTheme boundary exactly as before", () => {
    const { container } = render(<AdminTheme>content</AdminTheme>);
    const boundary = container.firstElementChild!;
    expect(boundary.className).toBe("admin-kit admin-kit--theme-core");
    expect(boundary.getAttribute("data-admin-kit-theme")).toBe("core");
    expect(document.querySelector("[class*='admin-kit--palette-']")).toBeNull();
  });

  it("treats an explicit core palette as the default", () => {
    render(<AdminTheme palette="core">content</AdminTheme>);
    expect(document.querySelector("[class*='admin-kit--palette-']")).toBeNull();
  });

  it("adds only a palette class, never a second theme name", () => {
    const { container } = render(<AdminTheme palette="graphite">content</AdminTheme>);
    const boundary = container.firstElementChild!;
    expect(boundary.className).toBe(`admin-kit admin-kit--theme-core ${graphite}`);
    expect(boundary.getAttribute("data-admin-kit-theme")).toBe("core");
    expect(document.querySelector("[class*='admin-kit--theme-graphite']")).toBeNull();
  });
});

describe("the graphite palette reaches nested boundaries", () => {
  it("propagates from AdminApp through its portal boundary", () => {
    render(
      <AdminApp
        activeSection="reports"
        groups={appGroups}
        onSectionChange={noop}
        palette="graphite"
      />,
    );
    expect(document.querySelector(".admin-kit__app")!.classList.contains(graphite)).toBe(true);
    const portal = document.querySelector(".admin-kit__portal")!;
    expect(portal.classList.contains(graphite)).toBe(true);
    expect(portal.classList.contains("admin-kit--theme-core")).toBe(true);
  });

  it("keeps every theme attribute core while graphite is opted in", () => {
    render(
      <AdminApp
        activeSection="reports"
        groups={appGroups}
        onSectionChange={noop}
        palette="graphite"
      />,
    );
    const themed = Array.from(document.querySelectorAll("[data-admin-kit-theme]"));
    expect(themed.length).toBeGreaterThan(0);
    for (const element of themed) {
      expect(element.getAttribute("data-admin-kit-theme")).toBe("core");
    }
  });

  it("is inherited by a standalone AdminPortal inside a graphite boundary", () => {
    render(
      <AdminTheme palette="graphite">
        <AdminPortal activeSection="billing" groups={portalGroups} onSectionChange={noop} />
      </AdminTheme>,
    );
    const portal = document.querySelector(".admin-kit__portal")!;
    expect(portal.classList.contains(graphite)).toBe(true);
    expect(portal.getAttribute("data-admin-kit-theme")).toBe("core");
  });

  it("is inherited by a nested AdminTheme that does not opt in again", () => {
    render(
      <AdminTheme palette="graphite">
        <AdminTheme className="inner">
          <p>nested</p>
        </AdminTheme>
      </AdminTheme>,
    );
    const inner = document.querySelector(".inner")!;
    expect(inner.classList.contains("admin-kit--theme-core")).toBe(true);
    expect(inner.getAttribute("data-admin-kit-theme")).toBe("core");
    expect(inner.closest(`.${graphite}`)).not.toBeNull();
  });
});

describe("the graphite palette reaches portaled layers", () => {
  it("wraps a dialog in a graphite layer that still reports the core theme", () => {
    render(
      <AdminTheme palette="graphite">
        <AdminDialog open title="Invite" onClose={noop}>
          body
        </AdminDialog>
      </AdminTheme>,
    );
    const layer = screen.getByRole("dialog").parentElement!.parentElement!;
    expect(layer.parentElement).toBe(document.body);
    expect(layer.className).toBe(`admin-kit admin-kit--theme-core ${graphite} admin-kit--layer`);
    expect(layer.getAttribute("data-admin-kit-theme")).toBe("core");
  });

  it("wraps a dialog opened from a nested AdminTheme in a graphite layer", () => {
    render(
      <AdminTheme palette="graphite">
        <AdminTheme>
          <AdminDialog open title="Invite" onClose={noop}>
            body
          </AdminDialog>
        </AdminTheme>
      </AdminTheme>,
    );
    const layer = screen.getByRole("dialog").parentElement!.parentElement!;
    expect(layer.classList.contains(graphite)).toBe(true);
    expect(layer.classList.contains("admin-kit--theme-core")).toBe(true);
    expect(layer.getAttribute("data-admin-kit-theme")).toBe("core");
  });

  it("leaves a default dialog layer untouched", () => {
    render(
      <AdminTheme>
        <AdminDialog open title="Invite" onClose={noop}>
          body
        </AdminDialog>
      </AdminTheme>,
    );
    const layer = screen.getByRole("dialog").parentElement!.parentElement!;
    expect(layer.className).toBe("admin-kit admin-kit--theme-core admin-kit--layer");
  });
});
