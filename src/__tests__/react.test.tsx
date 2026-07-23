import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import {
  AdminConfirmationDialog,
  AdminConsole,
  AdminPanelStateView,
  ApiKeysPanel,
  EventsPanel,
  FeatureFlagsPanel,
  UsersPanel,
} from "../react";

describe("AdminConsole", () => {
  it("renders controlled accessible tabs and only the active panel", () => {
    const html = renderToStaticMarkup(
      <AdminConsole
        activeSection="users"
        onSectionChange={() => undefined}
        sections={[
          { id: "users", label: "Users", render: () => <p>User content</p> },
          { id: "flags", label: "Feature flags", render: () => <p>Flag content</p> },
        ]}
      />,
    );

    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain("User content");
    expect(html).not.toContain("Flag content");
  });

  afterEach(cleanup);

  it("supports arrow-key roving-tabindex navigation between tabs", () => {
    const sections = [
      { id: "users", label: "Users", render: () => <p>User content</p> },
      { id: "flags", label: "Feature flags", render: () => <p>Flag content</p> },
      { id: "events", label: "Events", render: () => <p>Event content</p> },
    ];
    let activeSection = "users";
    const onSectionChange = (next: string) => {
      activeSection = next;
    };

    const { rerender } = render(
      <AdminConsole
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        sections={sections}
      />,
    );

    const usersTab = screen.getByRole("tab", { name: "Users" });
    const flagsTab = screen.getByRole("tab", { name: "Feature flags" });
    const eventsTab = screen.getByRole("tab", { name: "Events" });

    expect(usersTab.getAttribute("tabindex")).toBe("0");
    expect(flagsTab.getAttribute("tabindex")).toBe("-1");
    expect(eventsTab.getAttribute("tabindex")).toBe("-1");

    fireEvent.keyDown(usersTab, { key: "ArrowRight" });
    expect(activeSection).toBe("flags");
    rerender(
      <AdminConsole
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        sections={sections}
      />,
    );
    expect(document.activeElement).toBe(flagsTab);
    expect(flagsTab.getAttribute("tabindex")).toBe("0");
    expect(usersTab.getAttribute("tabindex")).toBe("-1");

    fireEvent.keyDown(flagsTab, { key: "ArrowLeft" });
    expect(activeSection).toBe("users");
    rerender(
      <AdminConsole
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        sections={sections}
      />,
    );
    expect(document.activeElement).toBe(usersTab);

    fireEvent.keyDown(usersTab, { key: "End" });
    expect(activeSection).toBe("events");
    rerender(
      <AdminConsole
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        sections={sections}
      />,
    );
    expect(document.activeElement).toBe(eventsTab);

    fireEvent.keyDown(eventsTab, { key: "Home" });
    expect(activeSection).toBe("users");
    rerender(
      <AdminConsole
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        sections={sections}
      />,
    );
    expect(document.activeElement).toBe(usersTab);
  });

  it("skips disabled tabs during arrow-key navigation", () => {
    const sections = [
      { id: "users", label: "Users", render: () => <p>User content</p> },
      { id: "flags", label: "Feature flags", disabled: true, render: () => <p>Flag content</p> },
      { id: "events", label: "Events", render: () => <p>Event content</p> },
    ];
    let activeSection = "users";
    const onSectionChange = (next: string) => {
      activeSection = next;
    };
    render(
      <AdminConsole
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        sections={sections}
      />,
    );

    const usersTab = screen.getByRole("tab", { name: "Users" });
    fireEvent.keyDown(usersTab, { key: "ArrowRight" });
    expect(activeSection).toBe("events");
  });
});

describe("host styling seams", () => {
  it("preserves a host class on every shared panel and portaled dialog", () => {
    const html = renderToStaticMarkup(
      <>
        <UsersPanel
          className="host-users"
          adapter={{ list: async () => ({ items: [], page: 1, pageSize: 25, total: 0 }) }}
        />
        <FeatureFlagsPanel
          className="host-flags"
          adapter={{ list: async () => ({ flags: [], storeHealth: "healthy" }) }}
        />
        <EventsPanel
          className="host-events"
          adapter={{ list: async () => ({ items: [], page: 1, pageSize: 25, total: 0 }) }}
        />
        <ApiKeysPanel
          className="host-keys"
          adapter={{
            list: async () => [],
            create: async () => ({
              secret: "secret",
              key: {
                id: "key",
                name: "Key",
                maskedKey: "…",
                scopes: [],
                state: "active",
                createdAt: "2026-01-01T00:00:00Z",
              },
            }),
            revoke: async () => undefined,
          }}
        />
        <AdminConfirmationDialog
          className="host-dialog"
          confirmLabel="Confirm"
          description="Description"
          onCancel={() => undefined}
          onConfirm={() => undefined}
          open
          title="Title"
        />
      </>,
    );

    expect(html).toContain("host-users");
    expect(html).toContain("host-flags");
    expect(html).toContain("host-events");
    expect(html).toContain("host-keys");
    expect(html).toContain("host-dialog");
  });
});

describe("AdminPanelStateView", () => {
  it("renders failures as an assertive accessible state", () => {
    const html = renderToStaticMarkup(
      <AdminPanelStateView state={{ kind: "error", detail: "Service unavailable" }} />,
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain("Service unavailable");
  });
});
