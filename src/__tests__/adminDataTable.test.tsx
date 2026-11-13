// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useState } from "react";
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

  it("saves a drag once, on release", () => {
    render(
      <AdminDataTable columns={columns} rowKey={(r) => r.id} rows={rows} storageKey="people" />,
    );
    const handle = screen.getByRole("separator");
    fireEvent.pointerDown(handle, { button: 0, clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 140, pointerId: 1 });
    expect(window.localStorage.getItem(STORAGE)).toBeNull();
    fireEvent.pointerUp(handle, { pointerId: 1 });
    expect(JSON.parse(window.localStorage.getItem(STORAGE)!)).toEqual({ name: 200 });
  });

  it("reloads widths when the storage key changes", () => {
    window.localStorage.setItem("admin-kit:table-widths:other", JSON.stringify({ name: 300 }));
    const { container, rerender } = render(
      <AdminDataTable columns={columns} rowKey={(r) => r.id} rows={rows} storageKey="people" />,
    );
    expect(colWidth(container, "name")).toBe("160px");
    rerender(
      <AdminDataTable columns={columns} rowKey={(r) => r.id} rows={rows} storageKey="other" />,
    );
    expect(colWidth(container, "name")).toBe("300px");
    fireEvent.keyDown(screen.getByRole("separator"), { key: "ArrowRight" });
    expect(window.localStorage.getItem(STORAGE)).toBeNull();
    expect(JSON.parse(window.localStorage.getItem("admin-kit:table-widths:other")!)).toEqual({
      name: 316,
    });
  });

  it("sizes the table to its columns when no column fills", () => {
    const sized = columns.map((column) => ({
      ...column,
      defaultWidth: column.defaultWidth ?? 200,
    }));
    const { container } = render(
      <AdminDataTable columns={sized} rowKey={(r) => r.id} rows={rows} />,
    );
    const table = container.querySelector("table")!;
    expect(table.style.getPropertyValue("--admin-kit-data-table-width")).toBe("360px");
  });

  it("marks a busy row aria-busy and leaves other rows unmarked", () => {
    const two = [...rows, { id: "r2", name: "Bo", note: "short" }];
    render(
      <AdminDataTable
        columns={columns}
        rowBusy={(r) => r.id === "r2"}
        rowKey={(r) => r.id}
        rows={two}
      />,
    );
    expect(screen.getByText("Bo").closest("tr")!.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText("Ada").closest("tr")!.hasAttribute("aria-busy")).toBe(false);
  });

  it("renders a caller-controlled expansion row under its row, after details", () => {
    const { rerender } = render(
      <AdminDataTable
        columns={columns}
        renderDetails={() => <p>Details body</p>}
        renderExpansion={(r) => (r.id === "r1" ? <p>Editing {r.name}</p> : null)}
        rowKey={(r) => r.id}
        rowLabel={(r) => r.name}
        rows={rows}
      />,
    );
    const row = screen.getByText("Ada").closest("tr")!;
    expect(row.className).toContain("admin-kit__data-table-row--expanded");
    const expansion = screen.getByText("Editing Ada").closest("tr")!;
    expect(expansion.className).toContain("admin-kit__data-table-details-row");
    expect(expansion.querySelector("td")!.getAttribute("colspan")).toBe("3");
    expect(row.nextElementSibling).toBe(expansion);

    fireEvent.click(screen.getByRole("button", { name: "View details for Ada" }));
    const details = screen.getByText("Details body").closest("tr")!;
    expect(row.nextElementSibling).toBe(details);
    expect(details.nextElementSibling).toBe(expansion);
    fireEvent.click(screen.getByRole("button", { name: "Hide details for Ada" }));

    rerender(
      <AdminDataTable
        columns={columns}
        renderExpansion={() => undefined}
        rowKey={(r) => r.id}
        rows={rows}
      />,
    );
    expect(screen.queryByText("Editing Ada")).toBeNull();
    expect(screen.getByText("Ada").closest("tr")!.className).toBe("");
  });

  describe("click menu (single-pointer resize)", () => {
    const click = (handle: HTMLElement) => {
      fireEvent.pointerDown(handle, { button: 0, clientX: 100, pointerId: 1 });
      fireEvent.pointerUp(handle, { clientX: 101, pointerId: 1 });
      fireEvent.click(handle);
    };
    const renderTable = () =>
      render(
        <AdminDataTable columns={columns} rowKey={(r) => r.id} rows={rows} storageKey="people" />,
      );
    const button = (name: string) => screen.getByRole("button", { name });

    it("opens from a plain click and steps the width by 32px, persisting each change", () => {
      renderTable();
      const handle = screen.getByRole("separator");
      expect(screen.queryByRole("group", { name: "Name column width" })).toBeNull();
      click(handle);
      expect(screen.getByRole("group", { name: "Name column width" })).toBeTruthy();
      expect(document.activeElement).toBe(button("Narrow Name column"));

      fireEvent.click(button("Widen Name column"));
      expect(handle.getAttribute("aria-valuenow")).toBe("192");
      expect(JSON.parse(window.localStorage.getItem(STORAGE)!)).toEqual({ name: 192 });
      fireEvent.click(button("Narrow Name column"));
      fireEvent.click(button("Narrow Name column"));
      expect(handle.getAttribute("aria-valuenow")).toBe("128");
      expect(JSON.parse(window.localStorage.getItem(STORAGE)!)).toEqual({ name: 128 });
      expect(screen.getByRole("group", { name: "Name column width" })).toBeTruthy();
    });

    it("clamps at the column minimum and maximum", () => {
      renderTable();
      const handle = screen.getByRole("separator");
      click(handle);
      for (let i = 0; i < 4; i += 1) fireEvent.click(button("Narrow Name column"));
      expect(handle.getAttribute("aria-valuenow")).toBe("96");
      for (let i = 0; i < 12; i += 1) fireEvent.click(button("Widen Name column"));
      expect(handle.getAttribute("aria-valuenow")).toBe("400");
    });

    it("resets the override, closes the menu and refocuses the handle", () => {
      renderTable();
      const handle = screen.getByRole("separator");
      click(handle);
      fireEvent.click(button("Widen Name column"));
      fireEvent.click(button("Reset Name column width"));
      expect(handle.getAttribute("aria-valuenow")).toBe("160");
      expect(window.localStorage.getItem(STORAGE)).toBeNull();
      expect(screen.queryByRole("group")).toBeNull();
      expect(document.activeElement).toBe(handle);
    });

    it("closes with Escape and returns focus to the handle", () => {
      renderTable();
      const handle = screen.getByRole("separator");
      click(handle);
      fireEvent.keyDown(button("Widen Name column"), { key: "Escape" });
      expect(screen.queryByRole("group")).toBeNull();
      expect(document.activeElement).toBe(handle);
    });

    it("closes on a pointerdown outside and on a second click of the handle", () => {
      renderTable();
      const handle = screen.getByRole("separator");
      click(handle);
      fireEvent.pointerDown(document.body);
      expect(screen.queryByRole("group")).toBeNull();
      click(handle);
      click(handle);
      expect(screen.queryByRole("group")).toBeNull();
    });

    it("does not open after a real drag", () => {
      renderTable();
      const handle = screen.getByRole("separator");
      fireEvent.pointerDown(handle, { button: 0, clientX: 100, pointerId: 1 });
      fireEvent.pointerMove(handle, { clientX: 150, pointerId: 1 });
      fireEvent.pointerUp(handle, { clientX: 150, pointerId: 1 });
      fireEvent.click(handle);
      expect(screen.queryByRole("group")).toBeNull();
      expect(handle.getAttribute("aria-valuenow")).toBe("210");
    });

    it("leaves the width alone for sub-threshold pointer jitter", () => {
      renderTable();
      const handle = screen.getByRole("separator");
      fireEvent.pointerDown(handle, { button: 0, clientX: 100, pointerId: 1 });
      fireEvent.pointerMove(handle, { clientX: 102, pointerId: 1 });
      fireEvent.pointerUp(handle, { clientX: 102, pointerId: 1 });
      fireEvent.click(handle);
      expect(handle.getAttribute("aria-valuenow")).toBe("160");
      expect(screen.getByRole("group")).toBeTruthy();
    });

    it("keeps double-click reset working and leaves no menu open", () => {
      renderTable();
      const handle = screen.getByRole("separator");
      fireEvent.keyDown(handle, { key: "ArrowRight" });
      click(handle);
      click(handle);
      fireEvent.doubleClick(handle);
      expect(handle.getAttribute("aria-valuenow")).toBe("160");
      expect(screen.queryByRole("group")).toBeNull();
    });
  });

  describe("fitting its container (PKG-328)", () => {
    const wideColumns: AdminDataTableColumn<Row>[] = [
      { id: "name", header: "Name", minWidth: 160, cell: (r) => r.name },
      { id: "note", header: "Note", defaultWidth: 200, minWidth: 120, cell: (r) => r.note },
      {
        id: "extra",
        header: "Extra",
        defaultWidth: 140,
        minWidth: 100,
        priority: "tertiary",
        cell: () => "extra",
      },
    ];
    const setContainerWidth = (width: number) =>
      Object.defineProperty(HTMLElement.prototype, "clientWidth", {
        configurable: true,
        get: () => width,
      });
    afterEach(() => {
      Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
    });

    it("hides tertiary columns when the container cannot hold them", () => {
      setContainerWidth(378);
      render(<AdminDataTable columns={wideColumns} rowKey={(r) => r.id} rows={rows} />);
      expect(screen.getAllByRole("columnheader").map((th) => th.textContent)).toEqual([
        "Name",
        "Note",
        "Details",
      ]);
    });

    it("stacks into cards only when the primary columns do not fit", () => {
      setContainerWidth(378);
      const roomy = render(
        <AdminDataTable columns={wideColumns} rowKey={(r) => r.id} rows={rows} />,
      );
      expect(roomy.container.querySelector("table")?.hasAttribute("data-stacked")).toBe(false);
      cleanup();
      setContainerWidth(270);
      const narrow = render(
        <AdminDataTable columns={wideColumns} rowKey={(r) => r.id} rows={rows} />,
      );
      expect(narrow.container.querySelector("table")?.hasAttribute("data-stacked")).toBe(true);
    });

    it("wraps a fragment cell in one value element so its nodes share a column", () => {
      const fragmentColumns: AdminDataTableColumn<Row>[] = [
        {
          id: "name",
          header: "Name",
          cell: (r) => (
            <>
              <strong>{r.name}</strong>
              <small>Best effort</small>
            </>
          ),
        },
      ];
      const { container } = render(
        <AdminDataTable columns={fragmentColumns} rowKey={(r) => r.id} rows={rows} />,
      );
      const cell = container.querySelector("tbody td")!;
      const value = cell.querySelector(":scope > .admin-kit__cell-value")!;
      expect(cell.children).toHaveLength(2);
      expect(value.textContent).toBe("AdaBest effort");
      expect(value.querySelectorAll("strong, small")).toHaveLength(2);
    });

    it("keeps a non-resizable column without a minWidth at its default width", () => {
      setContainerWidth(500);
      const { container } = render(
        <AdminDataTable
          columns={[
            { id: "name", header: "Name", minWidth: 160, cell: (r) => r.name },
            { id: "note", header: "Note", defaultWidth: 300, minWidth: 100, cell: (r) => r.note },
            {
              id: "actions",
              header: "Actions",
              defaultWidth: 168,
              resizable: false,
              cell: () => "Revoke",
            },
          ]}
          rowKey={(r) => r.id}
          rows={rows}
        />,
      );
      expect(colWidth(container, "actions")).toBe("168px");
      expect(colWidth(container, "note")).toBe("172px");
    });

    it("keeps hidden columns reachable in a labelled details row", () => {
      setContainerWidth(378);
      render(<AdminDataTable columns={wideColumns} rowKey={(r) => r.id} rows={rows} />);
      expect(screen.queryByText("extra")).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "View" }));
      const values = document.querySelector(".admin-kit__data-table-hidden-values")!;
      expect(values.querySelector("dt")?.textContent).toBe("Extra");
      expect(values.querySelector("dd")?.textContent).toBe("extra");
    });

    it("sets the card slot on the cell", () => {
      const { container } = render(
        <AdminDataTable
          columns={[{ ...columns[0]!, cardSlot: "title" }]}
          rowKey={(r) => r.id}
          rows={rows}
        />,
      );
      expect(container.querySelector("td")?.getAttribute("data-card-slot")).toBe("title");
    });
  });

  describe("expansion", () => {
    const detailsTable = (props: Partial<Parameters<typeof AdminDataTable<Row>>[0]> = {}) => (
      <AdminDataTable
        columns={columns}
        renderDetails={(r) => <p>Full note: {r.note}</p>}
        rowKey={(r) => r.id}
        rowLabel={(r) => r.name}
        rows={rows}
        {...props}
      />
    );

    it("marks the toggle with its row key so hosts can return focus", () => {
      render(detailsTable());
      expect(screen.getByRole("button", { name: /details for Ada/ }).getAttribute("data-row-key")).toBe(
        "r1",
      );
    });

    it("reports changes and follows expandedKeys when controlled", () => {
      const changes: (readonly string[])[] = [];
      function Host() {
        const [keys, setKeys] = useState<readonly string[]>(["r1"]);
        return detailsTable({
          expandedKeys: keys,
          onExpandedChange: (next) => {
            changes.push(next);
            setKeys([]);
          },
        });
      }
      render(<Host />);
      expect(screen.getByText(/Full note:/)).toBeTruthy();
      fireEvent.click(screen.getByRole("button", { name: /details for Ada/ }));
      expect(changes).toEqual([[]]);
      expect(screen.queryByText(/Full note:/)).toBeNull();
    });

    it("stays closed when a controlled host ignores the change", () => {
      render(detailsTable({ expandedKeys: [], onExpandedChange: () => undefined }));
      fireEvent.click(screen.getByRole("button", { name: /details for Ada/ }));
      expect(screen.queryByText(/Full note:/)).toBeNull();
    });
  });
});
