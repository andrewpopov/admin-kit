// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminApp, AdminPanelHeader, AdminPortal } from "../react";
import type { AdminPortalProps } from "../react";

afterEach(cleanup);

const groups = [
  {
    id: "core",
    label: "Core administration",
    description: "Shared operational controls",
    sections: [
      {
        id: "users",
        label: "Users",
        description: "Manage accounts",
        render: () => <p>User content</p>,
      },
      { id: "security", label: "Security", visible: false, render: () => <p>Security content</p> },
    ],
  },
  {
    id: "application",
    label: "Application",
    sections: [
      { id: "catalog", label: "Catalog", render: () => <p>Catalog content</p> },
      {
        id: "integration",
        label: "Integration",
        disabled: true,
        render: () => <p>Integration content</p>,
      },
    ],
  },
] as const;

describe("AdminPortal", () => {
  it("renders visible grouped navigation and the controlled routed section", () => {
    render(
      <AdminPortal activeSection="catalog" groups={groups} onSectionChange={() => undefined} />,
    );

    expect(screen.queryByRole("heading", { name: "Core administration" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Application" })).toBeNull();
    expect(screen.getByText("Core administration").className).toContain(
      "admin-kit__portal-group-label",
    );
    expect(screen.queryByText("Security")).toBeNull();
    expect(screen.getByRole("button", { name: "Catalog" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(screen.getByText("Catalog content")).toBeTruthy();
    expect(screen.queryByText("User content")).toBeNull();
  });

  it("offers controlled selection and prevents disabled navigation", () => {
    const onSectionChange = vi.fn();
    render(<AdminPortal activeSection="users" groups={groups} onSectionChange={onSectionChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Catalog" }));
    fireEvent.click(screen.getByRole("button", { name: "Integration" }));

    expect(onSectionChange).toHaveBeenCalledOnce();
    expect(onSectionChange).toHaveBeenCalledWith("catalog");
  });

  it("lets hosts render router links with package-owned navigation semantics", () => {
    const onSectionChange = vi.fn();
    render(
      <AdminPortal
        activeSection="users"
        groups={groups}
        onSectionChange={onSectionChange}
        renderNavigationItem={({
          section,
          className,
          ariaCurrent,
          ariaDisabled,
          tabIndex,
          onClick,
        }) => (
          <a
            aria-current={ariaCurrent}
            aria-disabled={ariaDisabled}
            className={className}
            href={`/admin/${section.id}`}
            onClick={(event) => {
              event.preventDefault();
              onClick(event);
            }}
            tabIndex={tabIndex}
          >
            {section.label}
          </a>
        )}
      />,
    );

    const catalog = screen.getByRole("link", { name: "Catalog" });
    expect(catalog.getAttribute("href")).toBe("/admin/catalog");
    fireEvent.click(catalog);
    expect(onSectionChange).toHaveBeenCalledWith("catalog");

    const disabled = screen.getByRole("link", { name: "Integration" });
    expect(disabled.getAttribute("aria-disabled")).toBe("true");
    expect(disabled.getAttribute("tabindex")).toBe("-1");
    fireEvent.click(disabled);
    expect(onSectionChange).toHaveBeenCalledOnce();
  });

  it("omits the navigation and Menu toggle when only one section is visible", () => {
    const { container } = render(
      <AdminPortal
        activeSection="users"
        groups={[{ id: "core", label: "Core", sections: [groups[0].sections[0]] }]}
        onSectionChange={() => undefined}
      />,
    );

    expect(container.querySelector("nav")).toBeNull();
    expect(screen.queryByRole("button", { name: "Menu" })).toBeNull();
    expect(screen.getByText("User content")).toBeTruthy();
    expect(container.querySelector(".admin-kit__portal--single")).not.toBeNull();
  });

  it("keeps the navigation and Menu toggle when several sections are visible", () => {
    const { container } = render(
      <AdminPortal activeSection="users" groups={groups} onSectionChange={() => undefined} />,
    );

    expect(container.querySelector("nav.admin-kit__portal-navigation")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Menu" })).toBeTruthy();
    expect(container.querySelector(".admin-kit__portal--single")).toBeNull();
  });

  it("renders an explicit empty state when capabilities hide every section", () => {
    render(
      <AdminPortal
        activeSection="users"
        groups={[{ ...groups[0], visible: false }]}
        emptyState={<p>No access</p>}
        onSectionChange={() => undefined}
      />,
    );

    expect(screen.getByText("No access")).toBeTruthy();
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("does not substitute another section when the active route is unavailable", () => {
    render(
      <AdminPortal
        activeSection="security"
        groups={groups}
        onSectionChange={() => undefined}
        inactiveSectionState={(sectionId) => <p>Unavailable: {sectionId}</p>}
      />,
    );

    expect(screen.getByText("Unavailable: security")).toBeTruthy();
    expect(screen.queryByText("User content")).toBeNull();
    expect(screen.queryByText("Catalog content")).toBeNull();
  });

  it("rejects inert default navigation from untyped consumers", () => {
    const invalid = { activeSection: "users", groups } as unknown as AdminPortalProps;
    expect(() => AdminPortal(invalid)).toThrow(/needs onSectionChange/i);
  });
});

describe("AdminApp", () => {
  it("uses the portal interaction contract while preserving an explicit application frame", () => {
    render(
      <AdminApp
        frame={{ title: "Administration", description: "Manage access and operations." }}
        activeSection="users"
        groups={[
          {
            id: "core",
            label: "Core administration",
            sections: [
              {
                id: "users",
                label: "Users",
                capability: "users",
                render: () => <p>User content</p>,
              },
            ],
          },
        ]}
        onSectionChange={() => undefined}
      />,
    );

    expect(screen.getByText("User content")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Administration" })).toBeTruthy();
    expect(screen.getByText("Manage access and operations.")).toBeTruthy();
  });

  it("omits the application masthead when host chrome already supplies page identity", () => {
    const { container } = render(
      <AdminApp
        activeSection="users"
        groups={[
          {
            id: "core",
            label: "Core administration",
            sections: [
              {
                id: "users",
                label: "Users",
                capability: "users",
                render: () => <p>User content</p>,
              },
            ],
          },
        ]}
        onSectionChange={() => undefined}
      />,
    );

    expect(screen.getByText("User content")).toBeTruthy();
    expect(container.querySelector(".admin-kit__app-header")).toBeNull();
  });
  describe("mobile navigation toggle", () => {
    const renderPortal = (onSectionChange = vi.fn()) =>
      render(
        <AdminPortal activeSection="users" groups={groups} onSectionChange={onSectionChange} />,
      );

    it("renders a collapsed Menu toggle wired to the navigation", () => {
      const { container } = renderPortal();
      const toggle = screen.getByRole("button", { name: "Menu" });
      const nav = container.querySelector("nav");

      expect(toggle.getAttribute("aria-expanded")).toBe("false");
      expect(toggle.getAttribute("aria-controls")).toBe(nav?.id);
      expect(nav?.hasAttribute("data-open")).toBe(false);
      expect(
        toggle.compareDocumentPosition(nav as Node) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("opens on toggle, closes on Escape, and returns focus to the toggle", () => {
      const { container } = renderPortal();
      const toggle = screen.getByRole("button", { name: "Menu" });

      fireEvent.click(toggle);
      expect(toggle.getAttribute("aria-expanded")).toBe("true");
      expect(container.querySelector("nav")?.hasAttribute("data-open")).toBe(true);

      screen.getByRole("button", { name: /Catalog/ }).focus();
      fireEvent.keyDown(screen.getByRole("button", { name: /Catalog/ }), { key: "Escape" });
      expect(toggle.getAttribute("aria-expanded")).toBe("false");
      expect(document.activeElement).toBe(toggle);
    });

    it("closes after navigating but stays open for a disabled section", () => {
      const onSectionChange = vi.fn();
      renderPortal(onSectionChange);
      const toggle = screen.getByRole("button", { name: "Menu" });

      fireEvent.click(toggle);
      fireEvent.click(screen.getByRole("button", { name: /Integration/ }));
      expect(toggle.getAttribute("aria-expanded")).toBe("true");

      fireEvent.click(screen.getByRole("button", { name: /Catalog/ }));
      expect(onSectionChange).toHaveBeenCalledWith("catalog");
      expect(toggle.getAttribute("aria-expanded")).toBe("false");
      expect(document.activeElement).toBe(toggle);
    });

    it("closes after activating a host-rendered link", () => {
      render(
        <AdminPortal
          activeSection="users"
          groups={groups}
          renderNavigationItem={({ section, className, onClick }) => (
            <a className={className} href={`#${section.id}`} onClick={onClick}>
              {section.label}
            </a>
          )}
        />,
      );
      const toggle = screen.getByRole("button", { name: "Menu" });
      fireEvent.click(toggle);
      fireEvent.click(screen.getByRole("link", { name: "Catalog" }));
      expect(toggle.getAttribute("aria-expanded")).toBe("false");
    });

    it("accepts a custom toggle label", () => {
      render(
        <AdminPortal
          activeSection="users"
          groups={groups}
          mobileNavigationLabel="Sections"
          onSectionChange={() => undefined}
        />,
      );
      expect(screen.getByRole("button", { name: "Sections" })).toBeTruthy();
    });
  });

  it("keeps exactly one h1 when the app frame and a page-presentation panel both render", () => {
    render(
      <AdminApp
        activeSection="users"
        frame={{ title: "Administration" }}
        groups={[
          {
            id: "core",
            label: "Core",
            sections: [
              {
                id: "users",
                label: "Users",
                capability: "users",
                render: () => <AdminPanelHeader presentation="page" title="Users" />,
              },
            ],
          },
        ]}
        onSectionChange={() => undefined}
      />,
    );
    expect(screen.getAllByRole("heading", { level: 1 }).map((h) => h.textContent)).toEqual([
      "Administration",
    ]);
    expect(screen.getByRole("heading", { level: 2, name: "Users" })).toBeTruthy();
  });
});
