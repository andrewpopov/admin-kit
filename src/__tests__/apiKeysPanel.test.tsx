// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiKeysPanel } from "../react";

const activeKey = {
  id: "key-1",
  name: "Automation",
  maskedKey: "ak_…1234",
  state: "active" as const,
  scopes: ["read"],
  createdAt: "2026-07-13T00:00:00.000Z",
};

afterEach(cleanup);

describe("ApiKeysPanel", () => {
  it("keeps the page header and host action mounted while loading", () => {
    render(
      <ApiKeysPanel
        adapter={{ list: () => new Promise(() => undefined), create: vi.fn(), revoke: vi.fn() }}
        headerActions={<button type="button">New key</button>}
        headerPresentation="page"
      />,
    );

    expect(screen.getByRole("heading", { name: "API keys", level: 1 })).toBeTruthy();
    expect(screen.getByRole("button", { name: "New key" })).toBeTruthy();
    expect(screen.getByText("Loading API keys…")).toBeTruthy();
  });

  it("keeps the page header mounted on the first load error", async () => {
    render(
      <ApiKeysPanel
        adapter={{
          list: vi.fn().mockRejectedValue(new Error("Keys unavailable")),
          create: vi.fn(),
          revoke: vi.fn(),
        }}
        headerPresentation="page"
      />,
    );

    await screen.findByText("Keys unavailable");
    expect(screen.getByRole("heading", { name: "API keys", level: 1 })).toBeTruthy();
  });

  it("composes the route title and host action in one page header", async () => {
    const { container } = render(
      <ApiKeysPanel
        adapter={{ list: vi.fn().mockResolvedValue([activeKey]), create: vi.fn(), revoke: vi.fn() }}
        headerActions={<button type="button">New key</button>}
        headerPresentation="page"
      />,
    );

    await screen.findByText("Automation");
    const header = container.querySelector(".admin-kit__panel-header--page");
    expect(header?.querySelector("h1")?.textContent).toBe("API keys");
    expect(header?.querySelector("button")?.textContent).toBe("New key");
    expect(screen.queryByRole("heading", { name: "API keys", level: 2 })).toBeNull();
  });

  it("reveals secrets only from create or confirmed rotation responses", async () => {
    const create = vi.fn().mockResolvedValue({ key: activeKey, secret: "create-once" });
    const rotate = vi.fn().mockResolvedValue({ key: activeKey, secret: "rotate-once" });
    render(
      <ApiKeysPanel
        createInput={{ name: "Automation" }}
        adapter={{ list: vi.fn().mockResolvedValue([activeKey]), create, revoke: vi.fn(), rotate }}
      />,
    );

    await screen.findByText("Automation");
    fireEvent.click(screen.getByRole("button", { name: "Create API key" }));
    await screen.findByText("create-once");
    expect(create).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: "I copied it" }));
    expect(screen.queryByText("create-once")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Rotate Automation" }));
    expect(screen.getByRole("dialog").textContent).toContain("Rotate API key");
    expect(rotate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Rotate key" }));

    await screen.findByText("rotate-once");
    expect(rotate).toHaveBeenCalledWith({ keyId: "key-1" });
  });

  it("requires explicit confirmation before revoking a key", async () => {
    const revoke = vi.fn().mockResolvedValue(undefined);
    render(
      <ApiKeysPanel
        createInput={{ name: "Automation" }}
        adapter={{ list: vi.fn().mockResolvedValue([activeKey]), create: vi.fn(), revoke }}
      />,
    );

    await screen.findByText("Automation");
    fireEvent.click(screen.getByRole("button", { name: "Revoke Automation" }));
    expect(revoke).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog").textContent).toContain("Revoke API key");
    fireEvent.click(screen.getByRole("button", { name: "Revoke key" }));

    await waitFor(() => expect(revoke).toHaveBeenCalledWith({ keyId: "key-1" }));
  });

  it("fires the adapter exactly once when Confirm is double-clicked", async () => {
    let resolveRevoke: (() => void) | undefined;
    const revoke = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveRevoke = resolve;
        }),
    );
    render(
      <ApiKeysPanel
        createInput={{ name: "Automation" }}
        adapter={{ list: vi.fn().mockResolvedValue([activeKey]), create: vi.fn(), revoke }}
      />,
    );

    await screen.findByText("Automation");
    fireEvent.click(screen.getByRole("button", { name: "Revoke Automation" }));
    const confirmButton = screen.getByRole("button", { name: "Revoke key" });
    fireEvent.click(confirmButton);
    fireEvent.click(confirmButton);

    expect(revoke).toHaveBeenCalledTimes(1);
    resolveRevoke?.();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(revoke).toHaveBeenCalledTimes(1);
  });

  it("derives expired state from durable metadata and removes lifecycle actions", async () => {
    const expired = {
      ...activeKey,
      expiresAt: "2020-01-01T00:00:00.000Z",
    };
    render(
      <ApiKeysPanel
        adapter={{
          list: vi.fn().mockResolvedValue([expired]),
          create: vi.fn(),
          revoke: vi.fn(),
          rotate: vi.fn(),
        }}
      />,
    );

    await screen.findByText(/expired/);
    expect(screen.queryByRole("button", { name: "Rotate Automation" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Revoke Automation" })).toBeNull();
  });

  it("formats lastUsedAt and expiresAt for display, and keeps the never fallback when absent", async () => {
    const withTimestamps = {
      ...activeKey,
      id: "key-2",
      name: "Automation with history",
      lastUsedAt: "2026-07-13T09:30:00.000Z",
      expiresAt: "2027-01-01T00:00:00.000Z",
    };
    render(
      <ApiKeysPanel
        adapter={{
          list: vi.fn().mockResolvedValue([withTimestamps, activeKey]),
          create: vi.fn(),
          revoke: vi.fn(),
        }}
      />,
    );

    await screen.findByText("Automation with history");
    // The formatted key's row must not show the raw ISO strings...
    expect(screen.queryByText(/2026-07-13T09:30:00\.000Z/)).toBeNull();
    expect(screen.queryByText(/2027-01-01T00:00:00\.000Z/)).toBeNull();
    // ...while a key with no lastUsedAt/expiresAt still falls back to "never".
    expect(screen.getAllByText(/never/).length).toBeGreaterThan(0);
  });

  it("lets a host-supplied formatTimestamp override the default presentation", async () => {
    const withTimestamps = {
      ...activeKey,
      lastUsedAt: "2026-07-13T09:30:00.000Z",
      expiresAt: "2027-01-01T00:00:00.000Z",
    };
    render(
      <ApiKeysPanel
        adapter={{
          list: vi.fn().mockResolvedValue([withTimestamps]),
          create: vi.fn(),
          revoke: vi.fn(),
        }}
        formatTimestamp={(iso) => `stamp:${iso}`}
      />,
    );

    await screen.findByText("Automation");
    expect(screen.getByText(/stamp:2026-07-13T09:30:00\.000Z/)).toBeTruthy();
    expect(screen.getByText(/stamp:2027-01-01T00:00:00\.000Z/)).toBeTruthy();
  });

  it("lets a host-owned form supply a dynamic create input", async () => {
    const create = vi.fn().mockResolvedValue({ key: activeKey, secret: "slot-once" });
    render(
      <ApiKeysPanel
        adapter={{ list: vi.fn().mockResolvedValue([activeKey]), create, revoke: vi.fn() }}
        title="Personal access tokens"
        renderCreate={({ create: submit, pending }) => (
          <button
            type="button"
            disabled={pending}
            onClick={() => void submit({ name: "CLI", expiresInDays: 30 })}
          >
            Generate token
          </button>
        )}
      />,
    );

    await screen.findByText("Automation");
    fireEvent.click(screen.getByRole("button", { name: "Generate token" }));
    await screen.findByText("slot-once");
    expect(screen.getByRole("heading", { name: "Personal access tokens" })).toBeTruthy();
    expect(create).toHaveBeenCalledWith({ name: "CLI", expiresInDays: 30 });
  });

  it("reports whether a host form submission created a key", async () => {
    let submit: ((input: { name: string }) => Promise<boolean>) | undefined;
    const create = vi
      .fn()
      .mockResolvedValueOnce({ key: activeKey, secret: "created-once" })
      .mockRejectedValueOnce(new Error("Creation denied"));
    render(
      <ApiKeysPanel
        adapter={{ list: vi.fn().mockResolvedValue([activeKey]), create, revoke: vi.fn() }}
        renderCreate={(controls) => {
          submit = controls.create;
          return null;
        }}
      />,
    );

    await screen.findByText("Automation");
    await expect(submit?.({ name: "CLI" })).resolves.toBe(true);
    await expect(submit?.({ name: "Denied" })).resolves.toBe(false);
    await screen.findByText("Creation denied");
  });

  it("keeps a newly issued secret visible when metadata refresh fails", async () => {
    const list = vi
      .fn()
      .mockResolvedValueOnce([activeKey])
      .mockRejectedValueOnce(new Error("Metadata refresh failed"));
    render(
      <ApiKeysPanel
        createInput={{ name: "Automation" }}
        adapter={{
          list,
          create: vi.fn().mockResolvedValue({ key: activeKey, secret: "recoverable-once" }),
          revoke: vi.fn(),
        }}
      />,
    );

    await screen.findByText("Automation");
    fireEvent.click(screen.getByRole("button", { name: "Create API key" }));

    await screen.findByText("recoverable-once");
    expect(screen.getByText("Metadata refresh failed")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Create API key" })).toBeTruthy();
  });

  it("keeps credential controls mounted after a failed mutation", async () => {
    render(
      <ApiKeysPanel
        createInput={{ name: "Automation" }}
        adapter={{
          list: vi.fn().mockResolvedValue([activeKey]),
          create: vi.fn().mockRejectedValue(new Error("Creation denied")),
          revoke: vi.fn(),
        }}
      />,
    );

    await screen.findByText("Automation");
    fireEvent.click(screen.getByRole("button", { name: "Create API key" }));

    await screen.findByText("Creation denied");
    expect(screen.getByText("Automation")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Create API key" })).toBeTruthy();
  });

  it("copies a one-time secret without putting it in list metadata", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(
      <ApiKeysPanel
        createInput={{ name: "Automation" }}
        adapter={{
          list: vi
            .fn()
            .mockResolvedValue([
              { ...activeKey, details: [{ label: "Allowed paths", value: "/api/books" }] },
            ]),
          create: vi.fn().mockResolvedValue({ key: activeKey, secret: "copy-once" }),
          revoke: vi.fn(),
        }}
      />,
    );

    await screen.findByText("Allowed paths");
    fireEvent.click(screen.getByRole("button", { name: "Create API key" }));
    await screen.findByText("copy-once");
    fireEvent.click(screen.getByRole("button", { name: "Copy secret" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith("copy-once"));
    expect(screen.getByText("Copied")).toBeTruthy();
  });

  it("lets a host-owned policy form update a key and reloads safe metadata", async () => {
    let submit: ((input: { allowedActions: string[] }) => Promise<boolean>) | undefined;
    const update = vi.fn().mockResolvedValue(activeKey);
    render(
      <ApiKeysPanel<{ name: string }, { allowedActions: string[] }>
        adapter={{
          list: vi.fn().mockResolvedValue([activeKey]),
          create: vi.fn(),
          revoke: vi.fn(),
          update,
        }}
        renderEdit={({ key, update: save }) => {
          submit = save;
          return <button type="button">Edit {key.name}</button>;
        }}
      />,
    );

    await screen.findByRole("button", { name: "Edit Automation" });
    await expect(submit?.({ allowedActions: ["pantry.read"] })).resolves.toBe(true);
    expect(update).toHaveBeenCalledWith({
      keyId: "key-1",
      update: { allowedActions: ["pantry.read"] },
    });
  });

  it("lets a host render policy-specific rows while the panel retains revoke confirmation", async () => {
    const revoke = vi.fn().mockResolvedValue(undefined);
    render(
      <ApiKeysPanel
        adapter={{ list: vi.fn().mockResolvedValue([activeKey]), create: vi.fn(), revoke }}
        renderKeys={({ keys, requestRevoke, pendingKeyId }) => (
          <div>
            <span>{keys[0]?.name} policy: organization projects</span>
            <span>{pendingKeyId ?? "idle"}</span>
            <button type="button" onClick={() => requestRevoke(keys[0]!)}>
              Delete custom key
            </button>
          </div>
        )}
      />,
    );

    await screen.findByText("Automation policy: organization projects");
    fireEvent.click(screen.getByRole("button", { name: "Delete custom key" }));
    expect(revoke).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Revoke key" }));
    await waitFor(() => expect(revoke).toHaveBeenCalledWith({ keyId: "key-1" }));
  });

  it("ignores a stale list response that resolves after the adapter changes", async () => {
    let resolveStale: ((value: unknown) => void) | undefined;
    const staleList = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveStale = resolve;
        }),
    );
    const freshKey = { ...activeKey, id: "key-2", name: "Fresh" };
    const freshList = vi.fn().mockResolvedValue([freshKey]);
    const { rerender } = render(
      <ApiKeysPanel adapter={{ list: staleList, create: vi.fn(), revoke: vi.fn() }} />,
    );
    await waitFor(() => expect(staleList).toHaveBeenCalledOnce());

    // Swap the adapter before the first (stale) request resolves.
    rerender(<ApiKeysPanel adapter={{ list: freshList, create: vi.fn(), revoke: vi.fn() }} />);
    await screen.findByText("Fresh");

    resolveStale?.([activeKey]);
    await waitFor(() => expect(screen.getByText("Fresh")).toBeTruthy());
    expect(screen.queryByText("Automation")).toBeNull();
  });

  it("clears a revealed secret when the adapter changes", async () => {
    const create = vi.fn().mockResolvedValue({ key: activeKey, secret: "create-once" });
    const { rerender } = render(
      <ApiKeysPanel
        createInput={{ name: "Automation" }}
        adapter={{ list: vi.fn().mockResolvedValue([activeKey]), create, revoke: vi.fn() }}
      />,
    );

    await screen.findByText("Automation");
    fireEvent.click(screen.getByRole("button", { name: "Create API key" }));
    await screen.findByText("create-once");

    rerender(
      <ApiKeysPanel
        createInput={{ name: "Automation" }}
        adapter={{ list: vi.fn().mockResolvedValue([activeKey]), create: vi.fn(), revoke: vi.fn() }}
      />,
    );

    await waitFor(() => expect(screen.queryByText("create-once")).toBeNull());
  });

  it("drops a create response and reload that resolve after the adapter changes", async () => {
    let resolveCreate: ((value: unknown) => void) | undefined;
    const staleCreate = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
    );
    const staleList = vi.fn().mockResolvedValue([activeKey]);
    const freshKey = { ...activeKey, id: "key-2", name: "Fresh" };
    const freshList = vi.fn().mockResolvedValue([freshKey]);
    const { rerender } = render(
      <ApiKeysPanel
        createInput={{ name: "Automation" }}
        adapter={{ list: staleList, create: staleCreate, revoke: vi.fn() }}
      />,
    );
    await screen.findByText("Automation");
    fireEvent.click(screen.getByRole("button", { name: "Create API key" }));
    await waitFor(() => expect(staleCreate).toHaveBeenCalledOnce());

    // Swap the adapter before the in-flight create resolves.
    rerender(
      <ApiKeysPanel
        createInput={{ name: "Automation" }}
        adapter={{ list: freshList, create: vi.fn(), revoke: vi.fn() }}
      />,
    );
    await screen.findByText("Fresh");
    const listCallsAfterSwap = staleList.mock.calls.length;

    // The stale create resolves for the old adapter after the swap: its
    // secret must not publish, and it must not trigger a reload against the
    // old adapter that could overwrite the new adapter's keys.
    resolveCreate?.({ key: activeKey, secret: "stale-secret" });
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(screen.queryByText("stale-secret")).toBeNull();
    expect(screen.getByText("Fresh")).toBeTruthy();
    expect(staleList.mock.calls.length).toBe(listCallsAfterSwap);
  });

  it("clears stale keys when the adapter changes and the new adapter's load fails", async () => {
    const { rerender } = render(
      <ApiKeysPanel
        adapter={{ list: vi.fn().mockResolvedValue([activeKey]), create: vi.fn(), revoke: vi.fn() }}
      />,
    );
    await screen.findByText("Automation");

    rerender(
      <ApiKeysPanel
        adapter={{
          list: vi.fn().mockRejectedValue(new Error("Key host unavailable")),
          create: vi.fn(),
          revoke: vi.fn(),
        }}
      />,
    );

    await screen.findByText("Key host unavailable");
    expect(screen.queryByText("Automation")).toBeNull();
  });

  it("gives a custom row the package-owned metadata update lifecycle", async () => {
    const update = vi.fn().mockResolvedValue(activeKey);
    let save:
      | ((key: typeof activeKey, input: { expiresAt: string | null }) => Promise<boolean>)
      | undefined;
    render(
      <ApiKeysPanel<{ name: string }, { expiresAt: string | null }>
        adapter={{
          list: vi.fn().mockResolvedValue([activeKey]),
          create: vi.fn(),
          revoke: vi.fn(),
          update,
        }}
        renderKeys={({ keys, update: updateKey }) => {
          save = updateKey;
          return <span>{keys[0]?.name}</span>;
        }}
      />,
    );
    await screen.findByText("Automation");
    await expect(save?.(activeKey, { expiresAt: null })).resolves.toBe(true);
    expect(update).toHaveBeenCalledWith({ keyId: "key-1", update: { expiresAt: null } });
  });
});

const scopeGroups = [
  {
    id: "library",
    label: "Library",
    scopes: [
      { value: "library.read", label: "Read catalog" },
      { value: "library.write", label: "Manage catalog" },
    ],
  },
] as const;

const scopedKey = {
  id: "key-1",
  name: "Automation",
  maskedKey: "ak_…1234",
  state: "active" as const,
  scopes: ["library.read"],
  createdAt: "2026-07-13T00:00:00.000Z",
};

describe("ApiKeysPanel built-in scope flows (scopeGroups)", () => {
  it("create card calls adapter.create with {name, expiresInDays, scopes}", async () => {
    const create = vi.fn().mockResolvedValue({ key: scopedKey, secret: "made-once" });
    render(
      <ApiKeysPanel
        scopeGroups={scopeGroups}
        adapter={{ list: vi.fn().mockResolvedValue([scopedKey]), create, revoke: vi.fn() }}
      />,
    );

    await screen.findByText("Automation");
    const createCard = screen.getByText("Create a new key").closest("details") as HTMLElement;
    const createForm = within(createCard);
    fireEvent.change(createForm.getByLabelText("Name"), { target: { value: "CLI" } });
    fireEvent.click(createForm.getByRole("checkbox", { name: /Manage catalog/ }));
    fireEvent.click(createForm.getByRole("button", { name: "Create API key" }));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith({
        name: "CLI",
        expiresInDays: 90,
        scopes: ["library.write"],
      }),
    );
    await screen.findByText("made-once");
  });

  it("opens the inline editor for one key at a time and closes it on Cancel", async () => {
    render(
      <ApiKeysPanel
        scopeGroups={scopeGroups}
        adapter={{
          list: vi.fn().mockResolvedValue([scopedKey]),
          create: vi.fn(),
          revoke: vi.fn(),
          update: vi.fn(),
        }}
      />,
    );

    await screen.findByText("Automation");
    expect(screen.queryByRole("region", { name: "Edit scopes for Automation" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Edit scopes for Automation" }));
    expect(screen.getByRole("region", { name: "Edit scopes for Automation" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("region", { name: "Edit scopes for Automation" })).toBeNull();
  });

  it("edit save calls adapter.update with {keyId, update:{scopes}} and reveals no secret", async () => {
    const update = vi.fn().mockResolvedValue(scopedKey);
    render(
      <ApiKeysPanel
        scopeGroups={scopeGroups}
        adapter={{
          list: vi.fn().mockResolvedValue([scopedKey]),
          create: vi.fn(),
          revoke: vi.fn(),
          update,
        }}
      />,
    );

    await screen.findByText("Automation");
    fireEvent.click(screen.getByRole("button", { name: "Edit scopes for Automation" }));
    const editor = within(screen.getByRole("region", { name: "Edit scopes for Automation" }));
    // Seeded from the key's scopes: library.read checked. Add library.write.
    expect(
      (editor.getByRole("checkbox", { name: /Read catalog/ }) as HTMLInputElement).checked,
    ).toBe(true);
    fireEvent.click(editor.getByRole("checkbox", { name: /Manage catalog/ }));
    fireEvent.click(editor.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({
        keyId: "key-1",
        update: { scopes: ["library.read", "library.write"] },
      }),
    );
    // Editing scopes must never surface a one-time secret.
    expect(screen.queryByText(/Copy this secret now/)).toBeNull();
    // A successful save closes the editor.
    await waitFor(() =>
      expect(screen.queryByRole("region", { name: "Edit scopes for Automation" })).toBeNull(),
    );
  });

  it("does not render the built-in Edit action when the adapter has no update", async () => {
    render(
      <ApiKeysPanel
        scopeGroups={scopeGroups}
        adapter={{ list: vi.fn().mockResolvedValue([scopedKey]), create: vi.fn(), revoke: vi.fn() }}
      />,
    );

    await screen.findByText("Automation");
    expect(screen.queryByRole("button", { name: "Edit scopes for Automation" })).toBeNull();
    // The rest of the active-row actions remain.
    expect(screen.getByRole("button", { name: "Revoke Automation" })).toBeTruthy();
  });

  it("renderEdit still overrides the built-in Edit action when both are provided", async () => {
    const update = vi.fn().mockResolvedValue(scopedKey);
    render(
      <ApiKeysPanel
        scopeGroups={scopeGroups}
        adapter={{
          list: vi.fn().mockResolvedValue([scopedKey]),
          create: vi.fn(),
          revoke: vi.fn(),
          update,
        }}
        renderEdit={({ key }) => <button type="button">Edit {key.name}</button>}
      />,
    );

    await screen.findByRole("button", { name: "Edit Automation" });
    expect(screen.queryByRole("button", { name: "Edit scopes for Automation" })).toBeNull();
  });

  it("without scopeGroups the create control stays the plain button and no Edit action appears", async () => {
    render(
      <ApiKeysPanel
        createInput={{ name: "Automation" }}
        adapter={{
          list: vi.fn().mockResolvedValue([scopedKey]),
          create: vi.fn(),
          revoke: vi.fn(),
          update: vi.fn(),
        }}
      />,
    );

    await screen.findByText("Automation");
    expect(screen.getByRole("button", { name: "Create API key" })).toBeTruthy();
    expect(screen.queryByText("Create a new key")).toBeNull();
    expect(screen.queryByRole("button", { name: "Edit scopes for Automation" })).toBeNull();
  });

  it("lets an operator remove a persisted scope outside the current vocabulary", async () => {
    const legacyKey = { ...scopedKey, scopes: ["/api"] };
    const update = vi.fn().mockResolvedValue({ ...legacyKey, scopes: [] });
    render(
      <ApiKeysPanel
        scopeGroups={scopeGroups}
        adapter={{
          list: vi.fn().mockResolvedValue([legacyKey]),
          create: vi.fn(),
          revoke: vi.fn(),
          update,
        }}
      />,
    );

    await screen.findByText("Automation");
    fireEvent.click(screen.getByRole("button", { name: "Edit scopes for Automation" }));
    const editor = within(screen.getByRole("region", { name: "Edit scopes for Automation" }));
    const legacyScope = editor.getByRole("checkbox", {
      name: /Existing scope.*\/api/,
    }) as HTMLInputElement;
    expect(legacyScope.checked).toBe(true);

    fireEvent.click(legacyScope);
    fireEvent.click(editor.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({ keyId: "key-1", update: { scopes: [] } }),
    );
  });
});
