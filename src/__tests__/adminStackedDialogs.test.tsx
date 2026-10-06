// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminConfirmationDialog, AdminDialog } from "../react";

afterEach(cleanup);

// The "Discard unsaved changes?" shape: a confirmation opened from inside a dialog.
function Harness() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <>
      <button onClick={() => setDialogOpen(true)} type="button">
        Open editor
      </button>
      <AdminDialog
        actions={
          <button onClick={() => setConfirmOpen(true)} type="button">
            Discard
          </button>
        }
        onClose={() => setDialogOpen(false)}
        open={dialogOpen}
        title="Editor"
      >
        <input aria-label="Name" />
      </AdminDialog>
      <AdminConfirmationDialog
        confirmLabel="Yes, discard"
        description="Unsaved changes are lost."
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => setConfirmOpen(false)}
        open={confirmOpen}
        title="Discard changes?"
      />
    </>
  );
}

function openStack() {
  render(<Harness />);
  fireEvent.click(screen.getByRole("button", { name: "Open editor" }));
  const discard = screen.getByRole("button", { name: "Discard" });
  discard.focus(); // a real click focuses its target; fireEvent.click does not
  fireEvent.click(discard);
  return {
    keep: screen.getByRole("button", { name: "Cancel" }),
    confirm: screen.getByRole("button", { name: "Yes, discard" }),
  };
}

describe("a confirmation stacked over a dialog", () => {
  it("traps Tab and Shift+Tab inside the confirmation only", () => {
    const { keep, confirm } = openStack();
    expect(document.activeElement).toBe(keep);
    const editor = screen.getByRole("dialog", { name: "Editor" });
    const focusedInEditor: EventTarget[] = [];
    const record = (event: FocusEvent) => {
      if (event.target instanceof Node && editor.contains(event.target)) {
        focusedInEditor.push(event.target);
      }
    };
    document.addEventListener("focusin", record);

    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(
      document.activeElement,
      "Shift+Tab from the first control wraps within the top dialog",
    ).toBe(confirm);

    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement, "Tab from the last control wraps within the top dialog").toBe(
      keep,
    );
    document.removeEventListener("focusin", record);
    expect(focusedInEditor, "focus never entered the underlying dialog").toEqual([]);
  });

  it("closes only the confirmation on Escape and returns focus inside the dialog", () => {
    openStack();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Discard changes?" })).toBeNull();
    const editor = screen.getByRole("dialog", { name: "Editor" });
    expect(editor.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Discard" }));
  });

  it("hands Tab and Escape back to the dialog once the confirmation closes", () => {
    openStack();
    fireEvent.keyDown(document, { key: "Escape" });
    const editor = screen.getByRole("dialog", { name: "Editor" });
    const name = screen.getByRole("textbox", { name: "Name" });
    const discard = screen.getByRole("button", { name: "Discard" });
    const close = screen.getByRole("button", { name: "Close dialog" });

    discard.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement, "the dialog's own trap wraps last -> first").toBe(close);
    name.focus();
    close.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement, "and first -> last").toBe(discard);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(editor.isConnected).toBe(false);
  });

  it("keeps Escape from reaching the dialog when the confirmation ignores it while pending", () => {
    const onClose = vi.fn();
    render(
      <>
        <AdminDialog onClose={onClose} open title="Editor">
          body
        </AdminDialog>
        <AdminConfirmationDialog
          confirmLabel="Go"
          description="Working"
          onCancel={() => undefined}
          onConfirm={() => undefined}
          open
          pending
          title="Busy"
        />
      </>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Busy" })).toBeTruthy();
  });
});
