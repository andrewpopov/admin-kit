// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { AdminDialog } from "../react/AdminDialog";

afterEach(cleanup);

function Harness({ closeDisabled = false }: { closeDisabled?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        Open invite
      </button>
      <AdminDialog
        closeDisabled={closeDisabled}
        onClose={() => setOpen(false)}
        open={open}
        title="Invite user"
      >
        <label>
          Email
          <input type="email" />
        </label>
      </AdminDialog>
    </>
  );
}

describe("AdminDialog", () => {
  it("portals a labelled form dialog and focuses its first field", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open invite" }));
    const dialog = screen.getByRole("dialog", { name: "Invite user" });
    expect(document.body.contains(dialog)).toBe(true);
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Email" }));
  });

  it("closes from Escape, the close button, and its backdrop", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open invite" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Open invite" }));
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Open invite" }));
    fireEvent.mouseDown(screen.getByRole("presentation"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("does not permit dismissal while close is disabled", () => {
    render(<Harness closeDisabled />);
    fireEvent.click(screen.getByRole("button", { name: "Open invite" }));
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.mouseDown(screen.getByRole("presentation"));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Close dialog" }).hasAttribute("disabled")).toBe(
      true,
    );
  });
});
