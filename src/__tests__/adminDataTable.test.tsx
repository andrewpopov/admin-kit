// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AdminDataTable, type AdminDataTableColumn } from "../react";

interface Row {
  id: string;
  name: string;
  note: string;
}

const rows: Row[] = [{ id: "r1", name: "Ada", note: "A very long note that will be truncated" }];

const columns: AdminDataTableColumn<Row>[] = [
  {
    id: "name",
    header: "Name",
    defaultWidth: 160,
    minWidth: 96,
    maxWidth: 400,
    cell: (r) => r.name,
  },
  {
    id: "note",
    header: "Note",
    truncate: true,
    title: (r) => r.note,
    cell: (r) => r.note,
  },
];

const STORAGE = "admin-kit:table-widths:people";

function colWidth(container: HTMLElement, id: string) {
  return (container.querySelector(`col[data-column="${id}"]`) as HTMLElement).style.width;
}

beforeEach(() => window.localStorage.clear());
afterEach(cleanup);

describe("AdminDataTable", () => {
  it("renders a labelled semantic table with a fill column", () => {
    const { container } = render(
      <AdminDataTable columns={columns} label="People" rowKey={(r) => r.id} rows={rows} />,
    );
    expect(screen.getByRole("table", { name: "People" })).toBeTruthy();
    expect(screen.getAllByRole("columnheader").map((th) => th.textContent)).toEqual([
      "Name",
      "Note",
    ]);
    expect(colWidth(container, "name")).toBe("160px");
    expect(colWidth(container, "note")).toBe("");
    expect(screen.getAllByRole("separator")).toHaveLength(1);
  });

  it("truncates with the full value as the cell title", () => {
    render(<AdminDataTable columns={columns} rowKey={(r) => r.id} rows={rows} />);
    const cell = screen.getByText(rows[0]!.note).closest("td")!;
    expect(cell.className).toContain("admin-kit__table-cell--truncate");
    expect(cell.getAttribute("title")).toBe(rows[0]!.note);
  });

  it("resizes from the keyboard within bounds and resets with Home", () => {
    const { container } = render(
      <AdminDataTable columns={columns} rowKey={(r) => r.id} rows={rows} />,
    );
    const handle = screen.getByRole("separator", { name: "Resize Name column" });
    expect(handle.getAttribute("tabindex")).toBe("0");
    expect(handle.getAttribute("aria-valuenow")).toBe("160");

    fireEvent.keyDown(handle, { key: "ArrowRight" });
    expect(colWidth(container, "name")).toBe("176px");
    fireEvent.keyDown(handle, { key: "ArrowLeft", shiftKey: true });
    fireEvent.keyDown(handle, { key: "ArrowLeft", shiftKey: true });
    expect(colWidth(container, "name")).toBe("96px");
    fireEvent.keyDown(handle, { key: "End" });
    expect(handle.getAttribute("aria-valuenow")).toBe("400");
    fireEvent.keyDown(handle, { key: "Home" });
    expect(colWidth(container, "name")).toBe("160px");
  });

  it("resizes by dragging the handle", () => {
    const { container } = render(
      <AdminDataTable columns={columns} rowKey={(r) => r.id} rows={rows} />,
    );
    const handle = screen.getByRole("separator");
    fireEvent.pointerDown(handle, { button: 0, clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 150, pointerId: 1 });
    fireEvent.pointerUp(handle, { pointerId: 1 });
    expect(colWidth(container, "name")).toBe("210px");
    fireEvent.pointerMove(handle, { clientX: 300, pointerId: 1 });
    expect(colWidth(container, "name")).toBe("210px");
  });

  it("persists widths per storage key and restores them", () => {
    const first = render(
      <AdminDataTable columns={columns} rowKey={(r) => r.id} rows={rows} storageKey="people" />,
    );
    fireEvent.keyDown(screen.getByRole("separator"), { key: "PageUp" });
    expect(JSON.parse(window.localStorage.getItem(STORAGE)!)).toEqual({ name: 224 });
    first.unmount();

    const { container } = render(
      <AdminDataTable columns={columns} rowKey={(r) => r.id} rows={rows} storageKey="people" />,
    );
    expect(colWidth(container, "name")).toBe("224px");
    fireEvent.keyDown(screen.getByRole("separator"), { key: "Home" });
    expect(window.localStorage.getItem(STORAGE)).toBeNull();
  });

  it("ignores corrupt or out-of-range stored widths", () => {
    window.localStorage.setItem(STORAGE, JSON.stringify({ name: 5000, note: "wide" }));
    const { container } = render(
      <AdminDataTable columns={columns} rowKey={(r) => r.id} rows={rows} storageKey="people" />,
    );
    expect(colWidth(container, "name")).toBe("400px");
    expect(colWidth(container, "note")).toBe("");

    cleanup();
    window.localStorage.setItem(STORAGE, "{not json");
    const again = render(
      <AdminDataTable columns={columns} rowKey={(r) => r.id} rows={rows} storageKey="people" />,
    );
    expect(colWidth(again.container, "name")).toBe("160px");
  });

  it("expands a full-width details row from a disclosure button", () => {
    render(
      <AdminDataTable
        columns={columns}
        renderDetails={(r) => <p>Full note: {r.note}</p>}
        rowKey={(r) => r.id}
        rowLabel={(r) => r.name}
        rows={rows}
      />,
    );
    const toggle = screen.getByRole("button", { name: "View details for Ada" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText(/Full note:/)).toBeNull();

    fireEvent.click(toggle);
    const hide = screen.getByRole("button", { name: "Hide details for Ada" });
    expect(hide.getAttribute("aria-expanded")).toBe("true");
    const details = document.getElementById(hide.getAttribute("aria-controls")!)!;
    expect(details.textContent).toContain("Full note:");
    expect(details.querySelector("td")!.getAttribute("colspan")).toBe("3");
  });
});
