// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineAdminSessionsAdapter, validateAdminSessions } from "../core";
import { SessionsPanel } from "../react";

afterEach(cleanup);

const sessions = [
  {
    id: "current",
    label: "Ada",
    secondaryLabel: "Safari on macOS",
    createdAt: "2026-07-14T10:00:00.000Z",
    lastSeenAt: "2026-07-14T12:00:00.000Z",
    current: true,
    details: [{ label: "IP", value: "192.0.2.1" }],
  },
  {
    id: "protected",
    label: "Grace",
    createdAt: "2026-07-13T10:00:00.000Z",
    expiresAt: "2026-08-13T10:00:00.000Z",
    permissions: { canRevoke: false },
  },
];

function adapter(overrides: Record<string, unknown> = {}) {
  return defineAdminSessionsAdapter({
    scope: { id: "all", label: "All accounts", kind: "application" },
    list: vi.fn().mockResolvedValue(sessions),
    revoke: { execute: vi.fn().mockResolvedValue(undefined) },
    bulkRevoke: {
      label: "Revoke other sessions",
      confirmTitle: "Revoke other sessions?",
      confirmDescription: "Every other client will need to sign in again.",
      execute: vi.fn().mockResolvedValue(undefined),
    },
    ...overrides,
  });
}

describe("active session contracts", () => {
  it("validates immutable safe session metadata without imposing token storage", () => {
    const result = validateAdminSessions(sessions);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result[0]?.details)).toBe(true);
  });

  it("rejects duplicate sessions and invalid bulk-action language", () => {
    expect(() => validateAdminSessions([sessions[0]!, sessions[0]!])).toThrow(/duplicate/i);
    expect(() =>
      defineAdminSessionsAdapter({
        scope: { id: "u1", label: "Ada", kind: "user" },
        list: async () => [],
        bulkRevoke: {
          label: " ",
          confirmTitle: "Confirm",
          confirmDescription: "Description",
          execute: async () => undefined,
        },
      }),
    ).toThrow(/label/i);
  });
});

describe("SessionsPanel", () => {
  it("renders safe metadata and hides revoke for a protected session", async () => {
    render(<SessionsPanel adapter={adapter()} />);
    expect(await screen.findByText("Safari on macOS")).toBeTruthy();
    expect(screen.getByText("Current")).toBeTruthy();
    expect(screen.getByText("192.0.2.1")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Revoke" })).toHaveLength(1);
  });

  it("confirms an individual revoke and reloads authoritative state", async () => {
    const revoke = vi.fn().mockResolvedValue(undefined);
    const list = vi.fn().mockResolvedValue(sessions);
    render(<SessionsPanel adapter={adapter({ list, revoke: { execute: revoke } })} />);
    fireEvent.click((await screen.findAllByRole("button", { name: "Revoke" }))[0]!);
    expect(revoke).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Revoke session" }));
    await waitFor(() => expect(revoke).toHaveBeenCalledWith({ sessionId: "current" }));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
  });

  it("uses host-owned bulk semantics instead of assuming revoke-all behavior", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    render(
      <SessionsPanel
        adapter={adapter({
          bulkRevoke: {
            label: "Revoke other sessions",
            confirmTitle: "Keep this device?",
            confirmDescription: "Other devices will sign out.",
            execute,
          },
        })}
      />,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Revoke other sessions" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("Keep this device?");
    fireEvent.click(within(dialog).getByRole("button", { name: "Revoke other sessions" }));
    await waitFor(() => expect(execute).toHaveBeenCalledTimes(1));
  });

  it("reports a rejected revoke without discarding the session list", async () => {
    render(
      <SessionsPanel
        adapter={adapter({
          revoke: { execute: vi.fn().mockRejectedValue(new Error("Current session is protected")) },
        })}
      />,
    );
    fireEvent.click((await screen.findAllByRole("button", { name: "Revoke" }))[0]!);
    fireEvent.click(screen.getByRole("button", { name: "Revoke session" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Current session is protected",
    );
    expect(screen.getByText("Safari on macOS")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
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

    const { rerender } = render(<SessionsPanel adapter={adapterA} />);
    expect(await screen.findByText("Safari on macOS")).toBeTruthy();

    rerender(<SessionsPanel adapter={adapterB} />);
    await waitFor(() => expect(listB).toHaveBeenCalledTimes(1));

    // adapter B's list is still pending: the panel must not show adapter A's
    // rows (an operator could revoke a session believing it belongs to the
    // scope named on screen), nor adapter A's scope label/count paired
    // with them.
    expect(screen.queryByText("Safari on macOS")).toBeNull();
    expect(screen.queryByText(/All accounts/)).toBeNull();
    expect(await screen.findByText("Loading active sessions…")).toBeTruthy();

    resolveB?.([]);
    expect(await screen.findByText(/Widgets workspace/)).toBeTruthy();
    expect(screen.queryByText("Safari on macOS")).toBeNull();
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
    // `load` is handed to host code as `reload` via `renderSessionActions`. A
    // host that stashes it (e.g. behind a "refresh" button elsewhere in its
    // own UI) instead of only calling it from within the SAME render's
    // handlers holds a closure bound to whatever scope was current when it
    // captured it -- this is a real, timing-independent bug (no effect-flush
    // gap needed): a SIMPLE A -> B swap is enough.
    let staleReload: (() => Promise<void>) | undefined;
    const listA = vi.fn().mockResolvedValue(sessions);
    const adapterA = adapter({ list: listA });

    let resolveB: ((value: unknown) => void) | undefined;
    const listB = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveB = resolve;
        }),
    );
    const sessionsB = [{ id: "b1", label: "Bob", createdAt: "2026-07-14T10:00:00.000Z" }];
    const adapterB = adapter({
      scope: { id: "workspace-2", label: "Widgets workspace", kind: "workspace" },
      list: listB,
    });

    const { rerender } = render(
      <SessionsPanel
        adapter={adapterA}
        renderSessionActions={(_session, { reload }) => {
          if (!staleReload) staleReload = reload;
          return null;
        }}
      />,
    );
    await screen.findByText("Safari on macOS");

    rerender(<SessionsPanel adapter={adapterB} />);
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
    // "Loading active sessions…" forever.
    resolveB?.(sessionsB);
    expect(await screen.findByText("Bob")).toBeTruthy();
  });

  it("does not let a call queued in a first A epoch land once A -> B -> the same A object is reused", async () => {
    let resolveRevoke: (() => void) | undefined;
    const revokeA = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveRevoke = () => resolve(undefined);
        }),
    );
    const listA = vi.fn().mockResolvedValue(sessions);
    // Created once and reused by identity below -- an identity-based guard
    // would treat "the adapter is A again" as still authoritative for a call
    // issued during the FIRST visit to A, even though a whole B epoch has
    // passed in between.
    const adapterA = adapter({ list: listA, revoke: { execute: revokeA } });
    const adapterB = adapter({
      scope: { id: "workspace-2", label: "Widgets workspace", kind: "workspace" },
      list: vi.fn().mockResolvedValue([]),
    });

    const { rerender } = render(<SessionsPanel adapter={adapterA} />);
    fireEvent.click((await screen.findAllByRole("button", { name: "Revoke" }))[0]!);
    fireEvent.click(screen.getByRole("button", { name: "Revoke session" }));
    await waitFor(() => expect(revokeA).toHaveBeenCalledTimes(1));
    expect(listA).toHaveBeenCalledTimes(1);

    rerender(<SessionsPanel adapter={adapterB} />);
    await waitFor(() => expect(screen.queryByText("Safari on macOS")).toBeNull());

    // Back to the SAME adapterA object: a new epoch, same identity.
    rerender(<SessionsPanel adapter={adapterA} />);
    await waitFor(() => expect(listA).toHaveBeenCalledTimes(2));

    resolveRevoke?.();

    // The stale revoke belongs to the FIRST A epoch. It must not trigger
    // another reload against the SECOND A epoch just because the adapter
    // object identity matches again.
    await expect(
      waitFor(() => expect(listA).toHaveBeenCalledTimes(3), { timeout: 300 }),
    ).rejects.toThrow();
  });

  it("does not let a stale reload from a first A epoch's revoke close a dialog opened under A's second epoch", async () => {
    let resolveFirstRevoke: (() => void) | undefined;
    let revokeCalls = 0;
    const revokeA = vi.fn().mockImplementation(() => {
      revokeCalls += 1;
      if (revokeCalls === 1) {
        return new Promise<void>((resolve) => {
          resolveFirstRevoke = () => resolve(undefined);
        });
      }
      return Promise.resolve(undefined);
    });
    const listA = vi.fn().mockResolvedValue(sessions);
    const adapterA = adapter({ list: listA, revoke: { execute: revokeA } });
    const adapterB = adapter({
      scope: { id: "workspace-2", label: "Widgets workspace", kind: "workspace" },
      list: vi.fn().mockResolvedValue([]),
    });

    const { rerender } = render(<SessionsPanel adapter={adapterA} />);
    fireEvent.click((await screen.findAllByRole("button", { name: "Revoke" }))[0]!);
    fireEvent.click(screen.getByRole("button", { name: "Revoke session" }));
    await waitFor(() => expect(revokeA).toHaveBeenCalledTimes(1));
    // The FIRST A epoch's revoke is still pending.

    rerender(<SessionsPanel adapter={adapterB} />);
    await waitFor(() => expect(screen.queryByText("Safari on macOS")).toBeNull());

    // Back to the SAME adapterA object: a new epoch, same identity.
    rerender(<SessionsPanel adapter={adapterA} />);
    expect(await screen.findByText("Safari on macOS")).toBeTruthy();

    // Operator opens a NEW confirmation dialog under this (second) A epoch.
    fireEvent.click((await screen.findAllByRole("button", { name: "Revoke" }))[0]!);
    expect(screen.getByRole("dialog")).toBeTruthy();

    // The FIRST epoch's revoke resolves now.
    resolveFirstRevoke?.();
    await new Promise((resolve) => setTimeout(resolve, 50));

    // The stale write belongs to the FIRST A epoch and must not close the
    // dialog the operator just opened under the SECOND A epoch, even though
    // the adapter object identity is the same one both times.
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
