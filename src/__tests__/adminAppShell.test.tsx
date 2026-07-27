import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminAppShell } from "../react";

afterEach(cleanup);

describe("AdminAppShell", () => {
  it("renders route-owned navigation in desktop and dismissible mobile landmarks", () => {
    const renderNavigation = vi.fn(({ idPrefix, onNavigate }) => (
      <a
        href="/admin/users"
        id={`${idPrefix}-users`}
        onClick={(event) => {
          event.preventDefault();
          onNavigate?.();
        }}
      >
        Users
      </a>
    ));

    render(
      <AdminAppShell
        frame={{ title: "Administration", description: "Manage the service." }}
        renderNavigation={renderNavigation}
      >
        <p>Users page</p>
      </AdminAppShell>,
    );

    expect(screen.getByRole("navigation", { name: "Administration sections" })).toBeTruthy();
    expect(screen.getByRole("main").textContent).toContain("Users page");
    expect(renderNavigation).toHaveBeenCalledWith({ idPrefix: "admin-kit-desktop" });

    fireEvent.click(screen.getByRole("button", { name: "Browse administration" }));
    expect(screen.getAllByRole("navigation", { name: "Administration sections" })).toHaveLength(2);
    fireEvent.click(screen.getByText("Users", { selector: "#admin-kit-mobile-users" }));
    expect(screen.getAllByRole("navigation", { name: "Administration sections" })).toHaveLength(1);
  });

  it("does not add a second title when the host already supplies identity chrome", () => {
    const { container } = render(
      <AdminAppShell renderNavigation={() => <a href="/admin">Home</a>}>
        <p>Content</p>
      </AdminAppShell>,
    );
    expect(container.querySelector("h1")).toBeNull();
  });

  it("uses unique mobile navigation IDs for independently mounted shells", () => {
    render(
      <>
        <AdminAppShell renderNavigation={() => <a href="/admin">One</a>}>One</AdminAppShell>
        <AdminAppShell renderNavigation={() => <a href="/admin">Two</a>}>Two</AdminAppShell>
      </>,
    );
    const toggles = screen.getAllByRole("button", { name: "Browse administration" });
    expect(toggles[0]?.getAttribute("aria-controls")).not.toBe(
      toggles[1]?.getAttribute("aria-controls"),
    );
  });

  it("renders the mobile toggle by default when mobileNavigation is omitted", () => {
    render(
      <AdminAppShell renderNavigation={() => <a href="/admin">Home</a>}>
        <p>Content</p>
      </AdminAppShell>,
    );
    expect(screen.getByRole("button", { name: "Browse administration" })).toBeTruthy();
  });

  it("omits the mobile toggle when mobileNavigation is false", () => {
    render(
      <AdminAppShell renderNavigation={() => <a href="/admin">Home</a>} mobileNavigation={false}>
        <p>Content</p>
      </AdminAppShell>,
    );
    expect(screen.queryByRole("button", { name: "Browse administration" })).toBeNull();
  });

  // The mobile <nav> needs its own guard, not just the toggle's: a host can flip
  // mobileNavigation to false while the nav is already open, and without that
  // guard the menu would stay on screen with no control left to dismiss it.
  it("tears down an already-open mobile nav when mobileNavigation becomes false", () => {
    const renderNavigation = () => <a href="/admin">Home</a>;
    const { rerender } = render(
      <AdminAppShell renderNavigation={renderNavigation}>
        <p>Content</p>
      </AdminAppShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Browse administration" }));
    expect(screen.getAllByRole("navigation", { name: "Administration sections" })).toHaveLength(2);

    rerender(
      <AdminAppShell renderNavigation={renderNavigation} mobileNavigation={false}>
        <p>Content</p>
      </AdminAppShell>,
    );

    expect(screen.queryByRole("button", { name: "Browse administration" })).toBeNull();
    // Only the desktop sidebar nav survives.
    expect(screen.getAllByRole("navigation", { name: "Administration sections" })).toHaveLength(1);
  });

  it("still renders the desktop navigation and children when mobileNavigation is false", () => {
    render(
      <AdminAppShell renderNavigation={() => <a href="/admin">Home</a>} mobileNavigation={false}>
        <p>Content</p>
      </AdminAppShell>,
    );
    expect(screen.getByRole("navigation", { name: "Administration sections" })).toBeTruthy();
    expect(screen.getByRole("main").textContent).toContain("Content");
  });
});
