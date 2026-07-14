// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminConfirmationDialog, type AdminConfirmationDialogProps } from "../react/AdminConfirmationDialog";

afterEach(cleanup);

function Harness({ pending = false }: { pending?: boolean }) {
  const [open, setOpen] = useState(false);
  const onConfirm = vi.fn();
  return (
    <div id="host-root">
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      <a href="#background">Background link</a>
      <AdminConfirmationDialog
        open={open}
        title="Danger zone"
        description="This cannot be undone."
        confirmLabel="Confirm"
        pending={pending}
        onCancel={() => setOpen(false)}
        onConfirm={onConfirm}
      />
    </div>
  );
}

describe("AdminConfirmationDialog", () => {
  it("restores focus to the trigger when the dialog was open from the first render", () => {
    // The dialog renders inline first (effects have not run, so it cannot
    // portal yet) and only moves into the portal once mounted. That second
    // pass must not recapture the focused element as the "trigger" — by then
    // it is the dialog's own Cancel button.
    function OpenFromFirstRender() {
      const [open, setOpen] = useState(true);
      return (
        <div>
          <button type="button" id="opener">Opener</button>
          <AdminConfirmationDialog
            open={open}
            title="Danger zone"
            description="This cannot be undone."
            confirmLabel="Confirm"
            onCancel={() => setOpen(false)}
            onConfirm={() => undefined}
          />
        </div>
      );
    }

    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();
    expect(document.activeElement).toBe(opener);

    render(<OpenFromFirstRender />);
    expect(screen.getByRole("dialog")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(document.activeElement).not.toBe(document.body);
    opener.remove();
  });

  it("cancels on Escape", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("traps Tab and Shift+Tab within the dialog", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    const confirmButton = screen.getByRole("button", { name: "Confirm" });
    expect(document.activeElement).toBe(cancelButton);

    // Tab forward from the last focusable element wraps to the first.
    confirmButton.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(cancelButton);

    // Shift+Tab backward from the first focusable element wraps to the last.
    cancelButton.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(confirmButton);

    // The background link must never receive focus while the dialog is open.
    expect(document.activeElement).not.toBe(screen.getByRole("link", { name: "Background link" }));
  });

  it("restores focus to the trigger element on close", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open dialog" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(document.activeElement).not.toBe(trigger);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.activeElement).toBe(trigger);
  });

  it("renders outside the panel's DOM subtree via a portal", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));

    const dialog = screen.getByRole("dialog");
    const hostRoot = document.getElementById("host-root");
    expect(hostRoot?.contains(dialog)).toBe(false);
    expect(document.body.contains(dialog)).toBe(true);
  });

  it("disables both Confirm and Cancel while pending", () => {
    render(<Harness pending />);
    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));

    expect(screen.getByRole("button", { name: "Cancel" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Confirm" }).hasAttribute("disabled")).toBe(true);
  });

  it("ignores Escape while pending instead of dismissing a dialog with a mutation in flight", () => {
    render(<Harness pending />);
    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));
    expect(screen.getByRole("dialog")).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).toBeTruthy();
  });

  it("keeps Tab from escaping the dialog when pending disables every focusable node", () => {
    render(<Harness pending />);
    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));

    const backgroundLink = screen.getByRole("link", { name: "Background link" });
    const event = fireEvent.keyDown(document, { key: "Tab" });

    // A `false` return from fireEvent means preventDefault() was called.
    expect(event).toBe(false);
    expect(document.activeElement).not.toBe(backgroundLink);
  });

  it("focuses inside the dialog when open is true from the very first render (SSR/hydration)", () => {
    function AlwaysOpen(props: Partial<AdminConfirmationDialogProps>) {
      return (
        <div id="always-open-host">
          <a href="#background">Background link</a>
          <AdminConfirmationDialog
            open
            title="Danger zone"
            description="This cannot be undone."
            confirmLabel="Confirm"
            onCancel={() => {}}
            onConfirm={() => {}}
            {...props}
          />
        </div>
      );
    }

    render(<AlwaysOpen />);

    const dialog = screen.getByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);
  });
});
