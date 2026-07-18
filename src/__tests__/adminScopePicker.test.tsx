// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminScopePicker } from "../react";
import type { AdminScopeGroup } from "../core";

const groups: readonly AdminScopeGroup[] = [
  {
    id: "library",
    label: "Library",
    description: "Read and manage the catalog.",
    scopes: [
      { value: "library.read", label: "Read catalog", description: "List books and metadata." },
      { value: "library.write", label: "Manage catalog" },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    scopes: [{ value: "admin.users", label: "Manage users" }],
  },
];

afterEach(cleanup);

describe("AdminScopePicker", () => {
  it("renders each group as a fieldset with a legend and its scopes as labelled checkboxes", () => {
    render(<AdminScopePicker groups={groups} value={[]} onChange={vi.fn()} />);

    const library = screen.getByRole("group", { name: "Library" });
    expect(library.tagName).toBe("FIELDSET");
    expect(screen.getByRole("group", { name: "Administration" })).toBeTruthy();
    expect(screen.getByText("Read and manage the catalog.")).toBeTruthy();
    expect(screen.getByText("List books and metadata.")).toBeTruthy();
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
    expect(screen.getByRole("checkbox", { name: /Read catalog/ })).toBeTruthy();
  });

  it("reflects the controlled value without mutating it", () => {
    const value = ["library.read"];
    render(<AdminScopePicker groups={groups} value={value} onChange={vi.fn()} />);

    expect((screen.getByRole("checkbox", { name: /Read catalog/ }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("checkbox", { name: /Manage catalog/ }) as HTMLInputElement).checked).toBe(false);
    expect(value).toEqual(["library.read"]);
  });

  it("appends a newly checked scope and reports it through onChange", () => {
    const onChange = vi.fn();
    render(<AdminScopePicker groups={groups} value={["admin.users"]} onChange={onChange} />);

    fireEvent.click(screen.getByRole("checkbox", { name: /Read catalog/ }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith(["admin.users", "library.read"]);
  });

  it("removes an unchecked scope while preserving the rest of the selection", () => {
    const onChange = vi.fn();
    render(
      <AdminScopePicker
        groups={groups}
        value={["library.read", "admin.users"]}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: /Read catalog/ }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith(["admin.users"]);
  });

  it("selects every scope in a group without duplicating already-selected values", () => {
    const onChange = vi.fn();
    render(<AdminScopePicker groups={groups} value={["library.write"]} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Select all in Library" }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith(["library.write", "library.read"]);
  });

  it("clears only that group's scopes when all of them are selected", () => {
    const onChange = vi.fn();
    render(
      <AdminScopePicker
        groups={groups}
        value={["library.read", "library.write", "admin.users"]}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Select none in Library" }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith(["admin.users"]);
  });

  it("disables every checkbox and group toggle when disabled", () => {
    const onChange = vi.fn();
    render(<AdminScopePicker disabled groups={groups} value={[]} onChange={onChange} />);

    for (const checkbox of screen.getAllByRole("checkbox")) {
      expect((checkbox as HTMLInputElement).disabled).toBe(true);
    }
    const toggle = screen.getByRole("button", { name: "Select all in Library" });
    expect((toggle as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: /Read catalog/ }));
    fireEvent.click(toggle);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("carries a host class on the root without replacing the kit class", () => {
    const { container } = render(
      <AdminScopePicker className="host-scopes" groups={groups} value={[]} onChange={vi.fn()} />,
    );

    const root = container.firstElementChild;
    expect(root?.classList.contains("admin-kit__scope-picker")).toBe(true);
    expect(root?.classList.contains("host-scopes")).toBe(true);
  });
});
