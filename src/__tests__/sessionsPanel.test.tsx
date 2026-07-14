// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineAdminSessionsAdapter, validateAdminSessions } from "../core";
import { SessionsPanel } from "../react";

afterEach(cleanup);

const sessions = [
  { id: "current", label: "Ada", secondaryLabel: "Safari on macOS", createdAt: "2026-07-14T10:00:00.000Z", lastSeenAt: "2026-07-14T12:00:00.000Z", current: true, details: [{ label: "IP", value: "192.0.2.1" }] },
  { id: "protected", label: "Grace", createdAt: "2026-07-13T10:00:00.000Z", expiresAt: "2026-08-13T10:00:00.000Z", permissions: { canRevoke: false } },
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
    expect(() => defineAdminSessionsAdapter({
      scope: { id: "u1", label: "Ada", kind: "user" },
      list: async () => [],
      bulkRevoke: { label: " ", confirmTitle: "Confirm", confirmDescription: "Description", execute: async () => undefined },
    })).toThrow(/label/i);
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
    render(<SessionsPanel adapter={adapter({ bulkRevoke: { label: "Revoke other sessions", confirmTitle: "Keep this device?", confirmDescription: "Other devices will sign out.", execute } })} />);
    fireEvent.click(await screen.findByRole("button", { name: "Revoke other sessions" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("Keep this device?");
    fireEvent.click(within(dialog).getByRole("button", { name: "Revoke other sessions" }));
    await waitFor(() => expect(execute).toHaveBeenCalledTimes(1));
  });

  it("reports a rejected revoke without discarding the session list", async () => {
    render(<SessionsPanel adapter={adapter({ revoke: { execute: vi.fn().mockRejectedValue(new Error("Current session is protected")) } })} />);
    fireEvent.click((await screen.findAllByRole("button", { name: "Revoke" }))[0]!);
    fireEvent.click(screen.getByRole("button", { name: "Revoke session" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Current session is protected");
    expect(screen.getByText("Safari on macOS")).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
