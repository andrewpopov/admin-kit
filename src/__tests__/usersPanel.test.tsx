// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UsersPanel } from "../react";

afterEach(cleanup);

const users = [
  {
    id: "u1",
    label: "ada@example.test",
    secondaryLabel: "Ada Lovelace",
    role: { value: "owner", label: "Owner" },
    status: { value: "active", label: "Active" },
    details: [
      { label: "Created", value: "Jul 10, 2026" },
      { label: "Last login", value: "Never" },
    ],
  },
];

describe("UsersPanel", () => {
  it("composes route title, search, and host actions in one page header", async () => {
    const { container } = render(
      <UsersPanel
        adapter={{
          list: vi.fn().mockResolvedValue({ items: users, page: 1, pageSize: 25, total: 1 }),
        }}
        headerPresentation="page"
        renderHeaderActions={() => <button type="button">Show deactivated</button>}
        search={{ placeholder: "Find an account" }}
      />,
    );

    await screen.findByText("Ada Lovelace");
    const header = container.querySelector(".admin-kit__panel-header--page");
    expect(header).toBeTruthy();
    expect(
      within(header as HTMLElement).getByRole("heading", { name: "Users", level: 1 }),
    ).toBeTruthy();
    expect(within(header as HTMLElement).getByRole("searchbox")).toBeTruthy();
    expect(
      within(header as HTMLElement).getByRole("button", { name: "Show deactivated" }),
    ).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Users", level: 2 })).toBeNull();
  });

  it("maps opt-in search to the adapter, resets pagination, and retains account facts", async () => {
    const list = vi.fn().mockImplementation(async ({ page, pageSize, search }) => ({
      items: users,
      page,
      pageSize,
      total: 51,
      search,
    }));
    render(
      <UsersPanel adapter={{ list }} pageSize={25} search={{ placeholder: "Find an account" }} />,
    );

    await screen.findByText("Ada Lovelace");
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByText("Created")).toBeTruthy();
    expect(screen.getByText("Jul 10, 2026")).toBeTruthy();
    expect(screen.getByText("Owner")).toBeTruthy();
    expect(screen.getByText("Active")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith({ page: 2, pageSize: 25, search: undefined }),
    );

    fireEvent.change(screen.getByPlaceholderText("Find an account"), { target: { value: "ada" } });
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith({ page: 1, pageSize: 25, search: "ada" }),
    );
  });

  it("renders an opt-in host table schema without the default columns", async () => {
    const list = vi.fn().mockResolvedValue({ items: users, page: 1, pageSize: 25, total: 1 });
    render(
      <UsersPanel
        adapter={{ list }}
        columns={[
          { id: "email", label: "Email", render: (user) => user.label },
          { id: "account", label: "Account", render: (user) => user.secondaryLabel },
        ]}
      />,
    );
    await screen.findByText("ada@example.test");
    expect(screen.getByRole("columnheader", { name: "Email" })).toBeTruthy();
    expect(screen.queryByRole("columnheader", { name: "Role" })).toBeNull();
  });

  it("sends custom-column sorting to the adapter and exposes the active direction", async () => {
    const list = vi.fn().mockResolvedValue({ items: users, page: 1, pageSize: 25, total: 1 });
    render(
      <UsersPanel
        adapter={{ list }}
        columns={[
          { id: "email", label: "Email", sortable: true, render: (user) => user.label },
          { id: "createdAt", label: "Created", sortable: true, render: () => "Jul 10, 2026" },
        ]}
        defaultSort={{ columnId: "createdAt", direction: "desc" }}
      />,
    );

    await screen.findByText("ada@example.test");
    expect(list).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort: "createdAt", order: "desc", page: 1 }),
    );
    expect(screen.getByRole("columnheader", { name: /Created/ }).getAttribute("aria-sort")).toBe(
      "descending",
    );

    fireEvent.click(screen.getByRole("button", { name: /Email/ }));
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith(
        expect.objectContaining({ sort: "email", order: "asc", page: 1 }),
      ),
    );
    expect(screen.getByRole("columnheader", { name: /Email/ }).getAttribute("aria-sort")).toBe(
      "ascending",
    );

    fireEvent.click(screen.getByRole("button", { name: /Email/ }));
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith(
        expect.objectContaining({ sort: "email", order: "desc", page: 1 }),
      ),
    );
  });

  it("keeps host header actions available while loading, empty, and failed", async () => {
    const list = vi.fn().mockResolvedValue({ items: [], page: 1, pageSize: 25, total: 0 });
    const headerAction = vi.fn(({ reload }: { reload: () => Promise<void> }) => (
      <button type="button" onClick={() => void reload()}>
        Invite user
      </button>
    ));
    render(<UsersPanel adapter={{ list }} renderHeaderActions={headerAction} />);

    await screen.findByText("No users found.");
    fireEvent.click(screen.getByRole("button", { name: "Invite user" }));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
    expect(headerAction).toHaveBeenLastCalledWith(expect.objectContaining({ isLoading: false }));
  });

  it("shows an error with host actions still available and retries the adapter", async () => {
    const list = vi
      .fn()
      .mockRejectedValueOnce(new Error("Directory unavailable"))
      .mockResolvedValueOnce({ items: users, page: 1, pageSize: 25, total: 1 });
    render(
      <UsersPanel
        adapter={{ list }}
        renderHeaderActions={() => <button type="button">Create user</button>}
      />,
    );

    await screen.findByText("Directory unavailable");
    expect(screen.getByRole("button", { name: "Create user" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    await screen.findByText("Ada Lovelace");
  });

  it("keeps a newer search result when an earlier request resolves late", async () => {
    let resolveInitial:
      | ((value: { items: typeof users; page: number; pageSize: number; total: number }) => void)
      | undefined;
    const list = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveInitial = resolve;
          }),
      )
      .mockResolvedValueOnce({
        items: [{ ...users[0], label: "grace@example.test", secondaryLabel: "Grace Hopper" }],
        page: 1,
        pageSize: 25,
        total: 1,
      });
    render(<UsersPanel adapter={{ list }} search={{}} />);

    await waitFor(() => expect(list).toHaveBeenCalledOnce());
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "grace" } });
    await screen.findByText("Grace Hopper");
    resolveInitial?.({ items: users, page: 1, pageSize: 25, total: 1 });

    await waitFor(() => expect(screen.getByText("Grace Hopper")).toBeTruthy());
    expect(screen.queryByText("Ada Lovelace")).toBeNull();
  });

  it("renders protected accounts as values when an adapter capability is unavailable for that account", async () => {
    render(
      <UsersPanel
        adapter={{
          list: async () => ({
            items: [
              {
                ...users[0],
                permissions: { canChangeRole: false, canChangeStatus: false },
              },
            ],
            page: 1,
            pageSize: 25,
            total: 1,
          }),
          roles: [
            { value: "owner", label: "Owner" },
            { value: "member", label: "Member" },
          ],
          statuses: [{ value: "active", label: "Active" }],
          setRole: { execute: async () => users[0] },
          setStatus: { execute: async () => users[0] },
        }}
      />,
    );

    await screen.findByText("Ada Lovelace");
    expect(screen.queryByRole("combobox", { name: "Role for ada@example.test" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Status for ada@example.test" })).toBeNull();
    expect(screen.getByText("Owner")).toBeTruthy();
    expect(screen.getByText("Active")).toBeTruthy();
  });

  it("shows an inline error and keeps the user table rendered after a rejected role change", async () => {
    const setRole = { execute: vi.fn().mockRejectedValue(new Error("Role change denied")) };
    render(
      <UsersPanel
        adapter={{
          list: vi.fn().mockResolvedValue({ items: users, page: 1, pageSize: 25, total: 1 }),
          roles: [
            { value: "owner", label: "Owner" },
            { value: "member", label: "Member" },
          ],
          setRole,
        }}
      />,
    );

    await screen.findByText("Ada Lovelace");
    fireEvent.change(screen.getByRole("combobox", { name: "Role for ada@example.test" }), {
      target: { value: "member" },
    });

    await screen.findByText("Role change denied");
    expect(screen.getByRole("alert").textContent).toBe("Role change denied");
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByText("Ada Lovelace")).toBeTruthy();
  });

  it("overrides the heading with the title prop", async () => {
    render(
      <UsersPanel
        title="Team members"
        adapter={{
          list: vi.fn().mockResolvedValue({ items: users, page: 1, pageSize: 25, total: 1 }),
        }}
      />,
    );

    await screen.findByRole("heading", { name: "Team members" });
    expect(screen.queryByRole("heading", { name: "Users" })).toBeNull();
  });

  it("omits empty details and actions columns instead of rendering blank table cells", async () => {
    render(
      <UsersPanel
        adapter={{
          list: async () => ({
            items: [
              {
                id: "u2",
                label: "grace@example.test",
                role: { value: "member", label: "Member" },
                status: { value: "active", label: "Active" },
              },
            ],
            page: 1,
            pageSize: 25,
            total: 1,
          }),
        }}
      />,
    );

    await screen.findByText("grace@example.test");
    expect(screen.queryByRole("columnheader", { name: "Details" })).toBeNull();
    expect(screen.queryByRole("columnheader", { name: "Actions" })).toBeNull();
  });

  it("reloads when a non-search query field changes", async () => {
    const list = vi.fn().mockImplementation(async ({ page, pageSize, status }) => ({
      items: users,
      page,
      pageSize,
      total: 1,
      status,
    }));
    const { rerender } = render(
      <UsersPanel adapter={{ list }} pageSize={25} query={{ status: "active" } as never} />,
    );

    await screen.findByText("Ada Lovelace");
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith({
        page: 1,
        pageSize: 25,
        status: "active",
        search: undefined,
      }),
    );

    // The `search` field is unchanged, but another query field changed; the
    // old dependency array (keyed only on `query?.search`) would never
    // re-fetch here.
    rerender(
      <UsersPanel adapter={{ list }} pageSize={25} query={{ status: "suspended" } as never} />,
    );
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith({
        page: 1,
        pageSize: 25,
        status: "suspended",
        search: undefined,
      }),
    );
  });

  it("steps back to the last valid page when the result set shrinks below the current page", async () => {
    const bigTotal = { items: users, page: 3, pageSize: 25, total: 60 };
    const shrunkTotal = { items: users, page: 1, pageSize: 25, total: 30 };
    const list = vi
      .fn()
      .mockResolvedValueOnce(bigTotal)
      .mockResolvedValueOnce(bigTotal)
      .mockResolvedValueOnce(bigTotal)
      .mockResolvedValue(shrunkTotal);
    let reload: (() => Promise<void>) | undefined;
    render(
      <UsersPanel
        adapter={{ list }}
        pageSize={25}
        renderHeaderActions={(context) => {
          reload = context.reload;
          return null;
        }}
      />,
    );

    await screen.findByText("Ada Lovelace");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith({ page: 2, pageSize: 25, search: undefined }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(list).toHaveBeenLastCalledWith({ page: 3, pageSize: 25, search: undefined }),
    );

    // A manual reload from page 3 now reports a shrunk total whose last
    // page (2) is below the current page; the panel must clamp back
    // instead of stranding the user on an empty page.
    await reload?.();
    await waitFor(() => expect(screen.getByText("Page 2 of 2")).toBeTruthy());
  });
});
