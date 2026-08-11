// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineAdminMembershipsAdapter } from "../core";
import { MembershipsPanel } from "../react";

afterEach(cleanup);

const members = [
  {
    memberId: "direct",
    label: "Ada",
    secondaryLabel: "ada@example.test",
    role: "admin",
    source: "explicit" as const,
    mutable: true,
  },
  {
    memberId: "inherited",
    label: "Grace",
    role: "member",
    source: "inherited" as const,
    mutable: false,
  },
];

function adapter(overrides: Record<string, unknown> = {}) {
  return defineAdminMembershipsAdapter<{ email: string }>({
    scope: { id: "workspace-1", label: "Acme workspace", kind: "workspace" },
    roles: [
      { value: "admin", label: "Admin", tone: "success" },
      { value: "member", label: "Member" },
    ],
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

    fireEvent.change(await screen.findByRole("combobox", { name: "Role for Ada" }), {
      target: { value: "member" },
    });
    await waitFor(() =>
      expect(setRole).toHaveBeenCalledWith({ memberId: "direct", role: "member" }),
    );
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
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Owner membership is protected",
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Ada")).toBeTruthy();
  });

  it("composes host-owned invite inputs through the package mutation lifecycle", async () => {
    const invite = vi.fn().mockResolvedValue(undefined);
    render(
      <MembershipsPanel
        adapter={adapter({ invite: { execute: invite } })}
        renderAddMember={({ submit, isPending }) => (
          <button
            disabled={isPending}
            type="button"
            onClick={() => void submit({ email: "new@example.test" })}
          >
            Invite account
          </button>
        )}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Invite account" }));
    await waitFor(() => expect(invite).toHaveBeenCalledWith({ email: "new@example.test" }));
  });

  it("honors host-computed per-member mutation permissions", async () => {
    const restricted = [
      { ...members[0]!, permissions: { canChangeRole: false, canRemove: false } },
    ];
    render(<MembershipsPanel adapter={adapter({ list: vi.fn().mockResolvedValue(restricted) })} />);

    expect(await screen.findByText("Ada")).toBeTruthy();
    expect(screen.queryByRole("combobox", { name: "Role for Ada" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Remove" })).toBeNull();
  });

  it("clears the previous scope's rows and label instead of showing them next to the new scope while its load is pending", async () => {
    const adapterA = adapter();
    let resolveB: ((value: unknown) => void) | undefined;
    const listB = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveB = resolve;
        }),
    );
    const adapterB = adapter({
      scope: { id: "workspace-2", label: "Widgets workspace", kind: "workspace" },
      list: listB,
    });

    const { rerender } = render(<MembershipsPanel adapter={adapterA} />);
    expect(await screen.findByText("Ada")).toBeTruthy();

    rerender(<MembershipsPanel adapter={adapterB} />);
    await waitFor(() => expect(listB).toHaveBeenCalledTimes(1));

    // adapter B's list is still pending: the panel must not show adapter A's
    // rows (an operator could act on a row believing it belongs to the scope
    // named on screen), nor adapter A's scope label/count paired with them.
    expect(screen.queryByText("Ada")).toBeNull();
    expect(screen.queryByText(/Acme workspace/)).toBeNull();
    expect(await screen.findByText("Loading members…")).toBeTruthy();

    resolveB?.([]);
    expect(await screen.findByText(/Widgets workspace/)).toBeTruthy();
    expect(screen.queryByText("Ada")).toBeNull();
  });

  it("does not let a stale in-flight remove's reload overwrite a newer adapter's members", async () => {
    let resolveRemove: (() => void) | undefined;
    const removeA = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveRemove = () => resolve(undefined);
        }),
    );
    const listA = vi.fn().mockResolvedValue(members);
    const adapterA = adapter({ list: listA, remove: { execute: removeA } });

    const membersB = [
      { memberId: "bob", label: "Bob", role: "member", source: "explicit" as const, mutable: true },
    ];
    const adapterB = adapter({
      scope: { id: "workspace-2", label: "Widgets workspace", kind: "workspace" },
      list: vi.fn().mockResolvedValue(membersB),
    });

    const { rerender } = render(<MembershipsPanel adapter={adapterA} />);
    fireEvent.click((await screen.findAllByRole("button", { name: "Remove" }))[0]!);
    fireEvent.click(screen.getByRole("button", { name: "Remove member" }));
    await waitFor(() => expect(removeA).toHaveBeenCalledTimes(1));
    expect(listA).toHaveBeenCalledTimes(1);

    rerender(<MembershipsPanel adapter={adapterB} />);
    expect(await screen.findByText("Bob")).toBeTruthy();

    resolveRemove?.();

    // The stale remove (issued under adapter A) resolves after adapter B is
    // mounted. Its own reload must never fire against adapter A, and it must
    // never overwrite adapter B's members with adapter A's stale rows.
    await expect(
      waitFor(() => expect(listA).toHaveBeenCalledTimes(2), { timeout: 300 }),
    ).rejects.toThrow();
    expect(screen.getByText("Bob")).toBeTruthy();
    expect(screen.queryByText("Ada")).toBeNull();
  });

  // Note on the two "same A object is reused" tests below: React Testing
  // Library's `rerender` is wrapped in `act()`, which flushes an updated
  // component's passive effects SYNCHRONOUSLY before `rerender` returns.
  // That collapses the exact gap Codex named (a request resolving between
  // commit and the effect running) for a plain A -> B swap, since by the
  // time a test can resolve a stale promise, any effect-based ref this test
  // harness could exercise has already run. The one construction that stays
  // a genuine, timing-independent bug is reusing the SAME adapter object
  // across A -> B -> A: an identity check cannot tell the first A visit from
  // the second no matter when it runs, so these tests build on that to pin
  // the real, load-bearing part of the fix -- the epoch is a counter, not an
  // identity comparison.
  it("does not let a retained stale reload from A corrupt B's own pending load", async () => {
    // `load` is handed to host code as `reload` via `renderAddMember`. A host
    // that stashes it (e.g. behind a "refresh" button elsewhere in its own
    // UI) instead of only calling it from within the SAME render's handlers
    // holds a closure bound to whatever scope was current when it captured
    // it -- this is a real, timing-independent bug (no effect-flush gap
    // needed): a SIMPLE A -> B swap is enough.
    let staleReload: (() => Promise<void>) | undefined;
    const listA = vi.fn().mockResolvedValue(members);
    const adapterA = adapter({
      list: listA,
      invite: { execute: vi.fn().mockResolvedValue(undefined) },
    });

    let resolveB: ((value: unknown) => void) | undefined;
    const listB = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveB = resolve;
        }),
    );
    const membersB = [
      { memberId: "bob", label: "Bob", role: "member", source: "explicit" as const, mutable: true },
    ];
    const adapterB = adapter({
      scope: { id: "workspace-2", label: "Widgets workspace", kind: "workspace" },
      list: listB,
    });

    const { rerender } = render(
      <MembershipsPanel
        adapter={adapterA}
        renderAddMember={({ reload }) => {
          staleReload = reload;
          return null;
        }}
      />,
    );
    await screen.findByText("Ada");

    rerender(<MembershipsPanel adapter={adapterB} />);
    await waitFor(() => expect(listB).toHaveBeenCalledTimes(1));
    // B's OWN load is genuinely in flight (never resolved) when the stale,
    // A-scoped `reload` closure the host retained gets invoked.

    void staleReload?.();
    await new Promise((resolve) => setTimeout(resolve, 50));

    // A stale reload must be a no-op: it must not even call adapter A's
    // list() again, let alone touch the shared load-id counter or clear an
    // error that belongs to whichever scope is actually current.
    expect(listA).toHaveBeenCalledTimes(1);

    // B's own pending load now resolves. If the stale reload had consumed
    // the shared load-id counter, B's own legitimate result would be
    // silently discarded here and the panel would stay stuck on
    // "Loading members…" forever.
    resolveB?.(membersB);
    expect(await screen.findByText("Bob")).toBeTruthy();
  });

  it("does not let a call queued in a first A epoch land once A -> B -> the same A object is reused", async () => {
    let resolveRemove: (() => void) | undefined;
    const removeA = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveRemove = () => resolve(undefined);
        }),
    );
    const listA = vi.fn().mockResolvedValue(members);
    // Created once and reused by identity below -- an identity-based guard
    // would treat "the adapter is A again" as still authoritative for a call
    // issued during the FIRST visit to A, even though a whole B epoch has
    // passed in between.
    const adapterA = adapter({ list: listA, remove: { execute: removeA } });
    const adapterB = adapter({
      scope: { id: "workspace-2", label: "Widgets workspace", kind: "workspace" },
      list: vi.fn().mockResolvedValue([]),
    });

    const { rerender } = render(<MembershipsPanel adapter={adapterA} />);
    fireEvent.click((await screen.findAllByRole("button", { name: "Remove" }))[0]!);
    fireEvent.click(screen.getByRole("button", { name: "Remove member" }));
    await waitFor(() => expect(removeA).toHaveBeenCalledTimes(1));
    expect(listA).toHaveBeenCalledTimes(1);

    rerender(<MembershipsPanel adapter={adapterB} />);
    await waitFor(() => expect(screen.queryByText("Ada")).toBeNull());

    // Back to the SAME adapterA object: a new epoch, same identity.
    rerender(<MembershipsPanel adapter={adapterA} />);
    await waitFor(() => expect(listA).toHaveBeenCalledTimes(2));

    resolveRemove?.();

    // The stale remove belongs to the FIRST A epoch. It must not trigger
    // another reload against the SECOND A epoch just because the adapter
    // object identity matches again.
    await expect(
      waitFor(() => expect(listA).toHaveBeenCalledTimes(3), { timeout: 300 }),
    ).rejects.toThrow();
  });

  it("does not let a stale reload from a first A epoch's mutation close a dialog opened under A's second epoch", async () => {
    let resolveFirstRemove: (() => void) | undefined;
    let removeCalls = 0;
    const removeA = vi.fn().mockImplementation(() => {
      removeCalls += 1;
      if (removeCalls === 1) {
        return new Promise<void>((resolve) => {
          resolveFirstRemove = () => resolve(undefined);
        });
      }
      return Promise.resolve(undefined);
    });
    const listA = vi.fn().mockResolvedValue(members);
    const adapterA = adapter({ list: listA, remove: { execute: removeA } });
    const adapterB = adapter({
      scope: { id: "workspace-2", label: "Widgets workspace", kind: "workspace" },
      list: vi.fn().mockResolvedValue([]),
    });

    const { rerender } = render(<MembershipsPanel adapter={adapterA} />);
    fireEvent.click((await screen.findAllByRole("button", { name: "Remove" }))[0]!);
    fireEvent.click(screen.getByRole("button", { name: "Remove member" }));
    await waitFor(() => expect(removeA).toHaveBeenCalledTimes(1));
    // The FIRST A epoch's remove is still pending.

    rerender(<MembershipsPanel adapter={adapterB} />);
    await waitFor(() => expect(screen.queryByText("Ada")).toBeNull());

    // Back to the SAME adapterA object: a new epoch, same identity.
    rerender(<MembershipsPanel adapter={adapterA} />);
    expect(await screen.findByText("Ada")).toBeTruthy();

    // Operator opens a NEW confirmation dialog under this (second) A epoch.
    fireEvent.click((await screen.findAllByRole("button", { name: "Remove" }))[0]!);
    expect(screen.getByRole("dialog")).toBeTruthy();

    // The FIRST epoch's remove resolves now.
    resolveFirstRemove?.();
    await new Promise((resolve) => setTimeout(resolve, 50));

    // The stale write belongs to the FIRST A epoch and must not close the
    // dialog the operator just opened under the SECOND A epoch, even though
    // the adapter object identity is the same one both times.
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
