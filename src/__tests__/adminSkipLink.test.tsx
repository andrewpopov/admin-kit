// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AdminApp, AdminPortal } from "../react";

afterEach(cleanup);

const groups = [
  {
    id: "core",
    label: "Core",
    sections: [
      {
        id: "users",
        label: "Users",
        capability: "users",
        render: () => <button type="button">First control in content</button>,
      },
    ],
  },
] as const;

describe("AdminApp skip link", () => {
  it("is the first tabbable element in document order, ahead of the frame header and navigation", () => {
    const { container } = render(
      <AdminApp
        frame={{ title: "Admin", actions: <a href="/profile">Profile</a> }}
        activeSection="users"
        groups={groups}
        onSectionChange={() => undefined}
      />,
    );
    const firstTabbable = container.querySelector(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    expect(firstTabbable).toBe(screen.getByRole("link", { name: "Skip to content" }));
  });

  it("moves focus to the content region without touching the URL hash", () => {
    render(<AdminApp activeSection="users" groups={groups} onSectionChange={() => undefined} />);
    const link = screen.getByRole("link", { name: "Skip to content" });
    const region = document.querySelector<HTMLElement>(".admin-kit__portal-content")!;
    expect(link.getAttribute("href")).toBe(`#${region.id}`);
    expect(region.getAttribute("tabindex")).toBe("-1");
    expect(region.tagName).toBe("DIV");

    fireEvent.click(link);
    expect(document.activeElement).toBe(region);
    expect(window.location.hash).toBe("");
  });

  it("takes its label from AdminLabels", () => {
    render(
      <AdminApp
        activeSection="users"
        groups={groups}
        labels={{ skipToContent: "Aller au contenu" }}
        onSectionChange={() => undefined}
      />,
    );
    expect(screen.getByRole("link", { name: "Aller au contenu" })).toBeTruthy();
  });

  it("targets the inactive-section message when no section is active", () => {
    render(<AdminApp activeSection="missing" groups={groups} onSectionChange={() => undefined} />);
    const link = screen.getByRole("link", { name: "Skip to content" });
    fireEvent.click(link);
    expect(document.activeElement?.className).toContain("admin-kit__portal-empty");
  });

  it("is not added to a standalone AdminPortal, whose content still gets a stable target", () => {
    render(<AdminPortal activeSection="users" groups={groups} onSectionChange={() => undefined} />);
    expect(screen.queryByRole("link", { name: "Skip to content" })).toBeNull();
    const region = document.querySelector<HTMLElement>(".admin-kit__portal-content")!;
    expect(region.id).not.toBe("");
    expect(region.getAttribute("tabindex")).toBe("-1");
  });
  it("keeps content ids unique when a portal is nested in a section or the frame actions", () => {
    const inner = (id: string, label: string) =>
      [
        {
          id: `${id}-group`,
          label,
          sections: [
            {
              id,
              label,
              capability: "custom:nested",
              render: () => <p>{label} content</p>,
            },
          ],
        },
      ] as const;
    const { container } = render(
      <AdminApp
        frame={{
          title: "Admin",
          actions: (
            <AdminPortal
              activeSection="a"
              groups={inner("a", "In actions")}
              onSectionChange={() => undefined}
            />
          ),
        }}
        activeSection="users"
        groups={[
          {
            id: "core",
            label: "Core",
            sections: [
              {
                id: "users",
                label: "Users",
                capability: "users",
                render: () => (
                  <AdminPortal
                    activeSection="b"
                    groups={inner("b", "In section")}
                    onSectionChange={() => undefined}
                  />
                ),
              },
            ],
          },
        ]}
        onSectionChange={() => undefined}
      />,
    );
    const regions = Array.from(
      container.querySelectorAll<HTMLElement>(".admin-kit__portal-content"),
    );
    expect(regions).toHaveLength(3);
    const ids = regions.map((region) => region.id);
    expect(new Set(ids).size).toBe(3);
    for (const id of ids) expect(container.querySelectorAll(`[id="${id}"]`)).toHaveLength(1);

    const outer = container.querySelector<HTMLElement>(
      ".admin-kit__app-portal > .admin-kit__portal-content",
    )!;
    const link = screen.getByRole("link", { name: "Skip to content" });
    expect(link.getAttribute("href")).toBe(`#${outer.id}`);
    fireEvent.click(link);
    expect(document.activeElement).toBe(outer);
  });
});
