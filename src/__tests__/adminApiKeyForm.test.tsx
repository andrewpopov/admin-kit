// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminApiKeyForm } from "../react";
import type { AdminScopeGroup } from "../core";

const groups: readonly AdminScopeGroup[] = [
  {
    id: "library",
    label: "Library",
    scopes: [
      { value: "library.read", label: "Read catalog" },
      { value: "library.write", label: "Manage catalog" },
    ],
  },
];

afterEach(cleanup);

describe("AdminApiKeyForm", () => {
  it("create mode emits an AdminApiKeyCreateRequest with name, expiry, and scopes", () => {
    const onSubmit = vi.fn();
    render(<AdminApiKeyForm mode="create" scopeGroups={groups} pending={false} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "CLI" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /Read catalog/ }));
    fireEvent.click(screen.getByRole("button", { name: "Create API key" }));

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
      name: "CLI",
      expiresInDays: 90,
      scopes: ["library.read"],
    });
  });

  it("create mode maps the expiry select to expiresInDays (Never → null)", () => {
    const onSubmit = vi.fn();
    render(<AdminApiKeyForm mode="create" scopeGroups={groups} pending={false} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "CLI" } });
    fireEvent.change(screen.getByLabelText("Expires"), { target: { value: "never" } });
    fireEvent.click(screen.getByRole("button", { name: "Create API key" }));

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({
      name: "CLI",
      expiresInDays: null,
      scopes: [],
    });
  });

  it("create mode disables submit until a name is entered", () => {
    render(<AdminApiKeyForm mode="create" scopeGroups={groups} pending={false} onSubmit={vi.fn()} />);

    const submit = screen.getByRole("button", { name: "Create API key" }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "CLI" } });
    expect(submit.disabled).toBe(false);
  });

  it("edit mode has no name/expiry fields and seeds the picker from initialScopes", () => {
    render(
      <AdminApiKeyForm
        mode="edit"
        scopeGroups={groups}
        pending={false}
        initialScopes={["library.read"]}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.queryByLabelText("Name")).toBeNull();
    expect(screen.queryByLabelText("Expires")).toBeNull();
    expect((screen.getByRole("checkbox", { name: /Read catalog/ }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("checkbox", { name: /Manage catalog/ }) as HTMLInputElement).checked).toBe(false);
    expect(screen.getByText(/does/)).toBeTruthy();
  });

  it("edit mode emits an AdminApiKeyScopeUpdate reflecting the edited scopes", () => {
    const onSubmit = vi.fn();
    render(
      <AdminApiKeyForm
        mode="edit"
        scopeGroups={groups}
        pending={false}
        initialScopes={["library.read"]}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: /Manage catalog/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith({ scopes: ["library.read", "library.write"] });
  });

  it("edit mode Cancel calls onCancel and never submits", () => {
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    render(
      <AdminApiKeyForm
        mode="edit"
        scopeGroups={groups}
        pending={false}
        initialScopes={["library.read"]}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables every control while pending", () => {
    render(
      <AdminApiKeyForm
        mode="edit"
        scopeGroups={groups}
        pending
        initialScopes={["library.read"]}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect((screen.getByRole("button", { name: "Save changes" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement).disabled).toBe(true);
    for (const checkbox of screen.getAllByRole("checkbox")) {
      expect((checkbox as HTMLInputElement).disabled).toBe(true);
    }
  });
});
