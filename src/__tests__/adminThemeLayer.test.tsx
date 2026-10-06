// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AdminConfirmationDialog, AdminDialog, AdminTheme } from "../react";

afterEach(cleanup);

const noop = () => undefined;

describe("portaled dialogs inherit the host theme boundary", () => {
  it("wraps AdminDialog in a themed layer when opened inside AdminTheme", () => {
    render(
      <AdminTheme>
        <AdminDialog open title="Invite" onClose={noop}>
          body
        </AdminDialog>
      </AdminTheme>,
    );
    const backdrop = screen.getByRole("dialog").parentElement!;
    const layer = backdrop.parentElement!;
    expect(layer.parentElement).toBe(document.body);
    expect(layer.classList.contains("admin-kit")).toBe(true);
    expect(layer.classList.contains("admin-kit--theme-core")).toBe(true);
    expect(layer.classList.contains("admin-kit--layer")).toBe(true);
    expect(layer.getAttribute("data-admin-kit-theme")).toBe("core");
  });

  it("wraps AdminConfirmationDialog in a themed layer when opened inside AdminTheme", () => {
    render(
      <AdminTheme>
        <AdminConfirmationDialog
          open
          title="Delete"
          description="Gone."
          confirmLabel="Delete"
          onCancel={noop}
          onConfirm={noop}
        />
      </AdminTheme>,
    );
    const layer = screen.getByRole("dialog").parentElement!.parentElement!;
    expect(layer.parentElement).toBe(document.body);
    expect(layer.className).toBe("admin-kit admin-kit--theme-core admin-kit--layer");
  });

  it("leaves dialogs outside any AdminTheme exactly as before", () => {
    render(
      <AdminDialog open title="Invite" onClose={noop}>
        body
      </AdminDialog>,
    );
    const backdrop = screen.getByRole("dialog").parentElement!;
    expect(backdrop.parentElement).toBe(document.body);
    expect(document.querySelector(".admin-kit--layer")).toBeNull();
  });
});
