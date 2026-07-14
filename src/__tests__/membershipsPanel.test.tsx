// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineAdminMembershipsAdapter } from "../core";
import { MembershipsPanel } from "../react";

afterEach(cleanup);

const members = [
  { memberId: "direct", label: "Ada", secondaryLabel: "ada@example.test", role: "admin", source: "explicit" as const, mutable: true },
  { memberId: "inherited", label: "Grace", role: "member", source: "inherited" as const, mutable: false },
];

function adapter(overrides: Record<string, unknown> = {}) {
  return defineAdminMembershipsAdapter<{ email: string }>({
    scope: { id: "workspace-1", label: "Acme workspace", kind: "workspace" },
    roles: [{ value: "admin", label: "Admin", tone: "success" }, { value: "member", label: "Member" }],
    list: vi.fn().mockResolvedValue(members),
    setRole: { execute: vi.fn().mockResolvedValue(undefined) },
    remove: { execute: vi.fn().mockResolvedValue(undefined) },
    invite: { execute: vi.fn().mockResolvedValue(undefined) },
    ...overrides,
  });
}

describe("MembershipsPanel", () => {
  it("renders direct and inherited access without exposing inherited mutations", async () => {
    render(<MembershipsPanel adapter={adapter()} />);

    expect(await screen.findByText("Ada")).toBeTruthy();
    expect(screen.getByText("Grace")).toBeTruthy();
    expect(screen.getByText("Direct")).toBeTruthy();
    expect(screen.getByText("Inherited")).toBeTruthy();
    expect(screen.getByRole("combobox", { name: "Role for Ada" })).toBeTruthy();
    expect(screen.queryByRole("combobox", { name: "Role for Grace" })).toBeNull();
    expect(screen.getAllByRole("button", { name: "Remove" })).toHaveLength(1);
  });

  it("reloads authoritative membership state after a role change", async () => {
    const setRole = vi.fn().mockResolvedValue(undefined);
    const list = vi.fn().mockResolvedValue(members);
    render(<MembershipsPanel adapter={adapter({ list, setRole: { execute: setRole } })} />);

    fireEvent.change(await screen.findByRole("combobox", { name: "Role for Ada" }), { target: { value: "member" } });
    await waitFor(() => expect(setRole).toHaveBeenCalledWith({ memberId: "direct", role: "member" }));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
  });

  it("requires confirmation before removing a direct membership", async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    render(<MembershipsPanel adapter={adapter({ remove: { execute: remove } })} />);

    fireEvent.click((await screen.findAllByRole("button", { name: "Remove" }))[0]!);
    expect(remove).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog").textContent).toContain("Acme workspace");
    fireEvent.click(screen.getByRole("button", { name: "Remove member" }));
    await waitFor(() => expect(remove).toHaveBeenCalledWith({ memberId: "direct" }));
  });

  it("closes the confirmation and reports a rejected removal without discarding the list", async () => {
    const remove = vi.fn().mockRejectedValue(new Error("Owner membership is protected"));
    render(<MembershipsPanel adapter={adapter({ remove: { execute: remove } })} />);

    fireEvent.click((await screen.findAllByRole("button", { name: "Remove" }))[0]!);
    fireEvent.click(screen.getByRole("button", { name: "Remove member" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Owner membership is protected");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Ada")).toBeTruthy();
  });

  it("composes host-owned invite inputs through the package mutation lifecycle", async () => {
    const invite = vi.fn().mockResolvedValue(undefined);
    render(<MembershipsPanel
      adapter={adapter({ invite: { execute: invite } })}
      renderAddMember={({ submit, isPending }) => <button disabled={isPending} type="button" onClick={() => void submit({ email: "new@example.test" })}>Invite account</button>}
    />);

    fireEvent.click(await screen.findByRole("button", { name: "Invite account" }));
    await waitFor(() => expect(invite).toHaveBeenCalledWith({ email: "new@example.test" }));
  });

  it("honors host-computed per-member mutation permissions", async () => {
    const restricted = [{ ...members[0]!, permissions: { canChangeRole: false, canRemove: false } }];
    render(<MembershipsPanel adapter={adapter({ list: vi.fn().mockResolvedValue(restricted) })} />);

    expect(await screen.findByText("Ada")).toBeTruthy();
    expect(screen.queryByRole("combobox", { name: "Role for Ada" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Remove" })).toBeNull();
  });
});
