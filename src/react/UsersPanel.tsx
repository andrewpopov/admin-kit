import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  type AdminPage,
  type AdminPageQuery,
  type AdminSortDirection,
  type AdminUserSummary,
  type AdminUsersAdapter,
} from "../core";
import { AdminPanelHeader, type AdminPanelHeaderPresentation } from "./AdminPanelHeader";
import { AdminPanelStateView } from "./AdminPanelState";

export interface UsersPanelProps<User extends AdminUserSummary> {
  adapter: AdminUsersAdapter<User>;
  title?: string;
  /** Promote the panel heading and controls into the route-level header band. */
  headerPresentation?: AdminPanelHeaderPresentation;
  pageSize?: number;
  query?: Omit<AdminPageQuery, "page" | "pageSize">;
  /** Opt in when the host adapter maps search text into its list query. */
  search?: false | { label?: string; placeholder?: string };
  /** The standard responsive semantic-table presentation. */
  presentation?: "table";
  /** Opt-in scan-first schema for hosts with richer account metadata. */
  columns?: readonly AdminUserTableColumn<User>[];
  /** Initial server-backed sort for a sortable custom column. */
  defaultSort?: AdminUserTableSort;
  renderHeaderActions?: (context: { reload: () => Promise<void>; isLoading: boolean }) => ReactNode;
  renderUserActions?: (
    user: User,
    context: { reload: () => Promise<void>; isPending: boolean },
  ) => ReactNode;
  /** Optional host class for local styling without replacing the panel. */
  className?: string;
}

export interface AdminUserTableColumn<User extends AdminUserSummary> {
  id: string;
  label: ReactNode;
  render: (user: User, context: AdminUserTableCellContext) => ReactNode;
  className?: string;
  headerClassName?: string;
  sortable?: boolean;
  /** Keeps concise values such as timestamps on a single line. */
  nowrap?: boolean;
  /** Responsive priority; lower-priority columns are hidden before the table scrolls. */
  priority?: "primary" | "secondary" | "tertiary";
}

export interface AdminUserTableSort {
  columnId: string;
  direction: AdminSortDirection;
}

export interface AdminUserTableCellContext {
  reload: () => Promise<void>;
  isPending: boolean;
  setRole: (role: string) => Promise<void>;
  setStatus: (status: string) => Promise<void>;
}

/**
 * A paged, adapter-backed user directory. It only owns normalized role and
 * status changes; hosts keep product-specific fields and destructive flows.
 */
export function UsersPanel<User extends AdminUserSummary>({
  adapter,
  title = "Users",
  headerPresentation = "section",
  pageSize = 25,
  query,
  search: searchOptions = false,
  presentation = "table",
  columns,
  defaultSort,
  renderHeaderActions,
  renderUserActions,
  className,
}: UsersPanelProps<User>) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(query?.search ?? "");
  const [result, setResult] = useState<AdminPage<User>>();
  const [loadError, setLoadError] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string>();
  const [sort, setSort] = useState<AdminUserTableSort | undefined>(defaultSort);
  const latestLoadId = useRef(0);
  const queryKey = JSON.stringify(query ?? null);

  const load = async () => {
    const loadId = ++latestLoadId.current;
    setIsLoading(true);
    setLoadError(undefined);
    try {
      const nextResult = await adapter.list({
        ...query,
        search: search || undefined,
        ...(sort ? { sort: sort.columnId, order: sort.direction } : {}),
        page,
        pageSize,
      });
      if (loadId === latestLoadId.current) setResult(nextResult);
    } catch (reason) {
      if (loadId === latestLoadId.current) {
        setLoadError(reason instanceof Error ? reason.message : "Unable to load users.");
      }
    } finally {
      if (loadId === latestLoadId.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // Invalidate synchronously with the transition: without this, a request
    // in flight for the previous page/search can still resolve and pass the
    // `loadId === latestLoadId.current` check because the effect that would
    // have bumped it for the new query hasn't started yet.
    return () => {
      latestLoadId.current += 1;
    };
    // `queryKey` is a serialized snapshot of `query` so any field change
    // (not just `search`) triggers a reload; `query` itself is not used
    // directly as a dependency because hosts commonly pass a fresh object
    // each render.
  }, [adapter, page, pageSize, queryKey, search, sort?.columnId, sort?.direction]);

  useEffect(() => {
    setSearch(query?.search ?? "");
  }, [query?.search]);

  useEffect(() => {
    if (!result) return;
    const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));
    if (page > lastPage) setPage(lastPage);
  }, [result, page]);

  const setSearchAndResetPage = (value: string) => {
    setPage(1);
    setSearch(value);
  };

  const updateSort = (columnId: string) => {
    setPage(1);
    setSort((current) => ({
      columnId,
      direction: current?.columnId === columnId && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const updateRole = async (userId: string, role: string) => {
    if (!adapter.setRole) return;
    setPendingUserId(userId);
    setActionError(undefined);
    try {
      await adapter.setRole.execute({ userId, role });
      await load();
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : "Unable to update the user role.");
    } finally {
      setPendingUserId(undefined);
    }
  };

  const updateStatus = async (userId: string, status: string) => {
    if (!adapter.setStatus) return;
    setPendingUserId(userId);
    setActionError(undefined);
    try {
      await adapter.setStatus.execute({ userId, status });
      await load();
    } catch (reason) {
      setActionError(
        reason instanceof Error ? reason.message : "Unable to update the user status.",
      );
    } finally {
      setPendingUserId(undefined);
    }
  };

  const searchControl =
    searchOptions !== false ? (
      <label className="admin-kit__users-search">
        <span>{searchOptions.label ?? "Search users"}</span>
        <input
          onChange={(event) => setSearchAndResetPage(event.target.value)}
          placeholder={searchOptions.placeholder ?? "Search by name or email"}
          type="search"
          value={search}
        />
      </label>
    ) : null;
  const hostHeaderActions = renderHeaderActions?.({ reload: load, isLoading });
  const toolbar =
    headerPresentation === "page" && (searchControl || hostHeaderActions) ? (
      <>
        {searchControl}
        {hostHeaderActions}
      </>
    ) : null;

  return (
    <section
      className={["admin-kit__users", className].filter(Boolean).join(" ")}
      aria-label={title}
    >
      <AdminPanelHeader
        actions={headerPresentation === "section" ? hostHeaderActions : null}
        className="admin-kit__users-header"
        detail={
          result ? (
            <p>
              {result.total} {result.total === 1 ? "user" : "users"}
            </p>
          ) : null
        }
        presentation={headerPresentation}
        title={title}
        toolbar={toolbar}
      />
      {headerPresentation === "section" ? searchControl : null}
      {loadError && !result ? (
        <AdminPanelStateView
          state={{ kind: "error", detail: loadError, onRetry: () => void load() }}
        />
      ) : !result ? (
        <AdminPanelStateView state={{ kind: "loading", label: "Loading users…" }} />
      ) : result.items.length === 0 ? (
        <AdminPanelStateView state={{ kind: "empty", title: "No users found." }} />
      ) : (
        <>
          {loadError ? (
            <AdminPanelStateView
              state={{ kind: "error", detail: loadError, onRetry: () => void load() }}
            />
          ) : null}
          {actionError ? (
            <p className="admin-kit__action-error" role="alert">
              {actionError}
            </p>
          ) : null}
          {presentation === "table"
            ? (() => {
                if (columns?.length)
                  return (
                    <div className="admin-kit__table-wrap admin-kit__users-table-wrap">
                      <table className="admin-kit__table admin-kit__users-table admin-kit__users-table--custom">
                        <thead>
                          <tr>
                            {columns.map((column) => {
                              const direction =
                                sort?.columnId === column.id ? sort.direction : undefined;
                              const layoutClassName = [
                                column.headerClassName,
                                column.nowrap ? "admin-kit__table-cell--nowrap" : undefined,
                                column.priority
                                  ? `admin-kit__table-cell--${column.priority}`
                                  : undefined,
                              ]
                                .filter(Boolean)
                                .join(" ");
                              return (
                                <th
                                  aria-sort={
                                    column.sortable
                                      ? direction === "asc"
                                        ? "ascending"
                                        : direction === "desc"
                                          ? "descending"
                                          : "none"
                                      : undefined
                                  }
                                  className={layoutClassName || undefined}
                                  key={column.id}
                                  scope="col"
                                >
                                  {column.sortable ? (
                                    <button
                                      className="admin-kit__sort-button"
                                      type="button"
                                      onClick={() => updateSort(column.id)}
                                    >
                                      {column.label}
                                      <span aria-hidden="true">
                                        {direction === "asc"
                                          ? "↑"
                                          : direction === "desc"
                                            ? "↓"
                                            : "↕"}
                                      </span>
                                    </button>
                                  ) : (
                                    column.label
                                  )}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {result.items.map((user) => (
                            <tr key={user.id} aria-busy={pendingUserId === user.id}>
                              {columns.map((column) => (
                                <td
                                  className={
                                    [
                                      column.className,
                                      column.nowrap ? "admin-kit__table-cell--nowrap" : undefined,
                                      column.priority
                                        ? `admin-kit__table-cell--${column.priority}`
                                        : undefined,
                                    ]
                                      .filter(Boolean)
                                      .join(" ") || undefined
                                  }
                                  key={column.id}
                                >
                                  {column.render(user, {
                                    reload: load,
                                    isPending: pendingUserId === user.id,
                                    setRole: (role) => updateRole(user.id, role),
                                    setStatus: (status) => updateStatus(user.id, status),
                                  })}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                const hasDetails = result.items.some((user) => user.details?.length);
                const hasActions = Boolean(renderUserActions);
                return (
                  <div className="admin-kit__table-wrap admin-kit__users-table-wrap">
                    <table
                      className={`admin-kit__table admin-kit__users-table${hasDetails ? " admin-kit__users-table--with-details" : ""}`}
                    >
                      <thead>
                        <tr>
                          <th scope="col">User</th>
                          {hasDetails ? <th scope="col">Details</th> : null}
                          <th scope="col">Role</th>
                          <th scope="col">Status</th>
                          {hasActions ? <th scope="col">Actions</th> : null}
                        </tr>
                      </thead>
                      <tbody>
                        {result.items.map((user) => (
                          <tr key={user.id} aria-busy={pendingUserId === user.id}>
                            <td>
                              <div className="admin-kit__user-identity">
                                <strong>{user.label}</strong>
                                {user.secondaryLabel ? <span>{user.secondaryLabel}</span> : null}
                                {user.badges?.length ? (
                                  <span>{user.badges.join(" · ")}</span>
                                ) : null}
                              </div>
                            </td>
                            {hasDetails ? (
                              <td>
                                {user.details?.length ? (
                                  <dl className="admin-kit__user-details">
                                    {user.details.map((detail) => (
                                      <div key={detail.label}>
                                        <dt>{detail.label}</dt>
                                        <dd>{detail.value}</dd>
                                      </div>
                                    ))}
                                  </dl>
                                ) : (
                                  <span className="admin-kit__user-empty">—</span>
                                )}
                              </td>
                            ) : null}
                            <td>
                              {adapter.roles?.length &&
                              adapter.setRole &&
                              user.role &&
                              user.permissions?.canChangeRole !== false ? (
                                <select
                                  aria-label={`Role for ${user.label}`}
                                  disabled={pendingUserId === user.id}
                                  value={user.role.value}
                                  onChange={(event) => void updateRole(user.id, event.target.value)}
                                >
                                  {adapter.roles.map((role) => (
                                    <option key={role.value} value={role.value}>
                                      {role.label}
                                    </option>
                                  ))}
                                </select>
                              ) : user.role ? (
                                <span className="admin-kit__user-value">{user.role.label}</span>
                              ) : null}
                            </td>
                            <td>
                              {adapter.statuses?.length &&
                              adapter.setStatus &&
                              user.status &&
                              user.permissions?.canChangeStatus !== false ? (
                                <select
                                  aria-label={`Status for ${user.label}`}
                                  disabled={pendingUserId === user.id}
                                  value={user.status.value}
                                  onChange={(event) =>
                                    void updateStatus(user.id, event.target.value)
                                  }
                                >
                                  {adapter.statuses.map((status) => (
                                    <option key={status.value} value={status.value}>
                                      {status.label}
                                    </option>
                                  ))}
                                </select>
                              ) : user.status ? (
                                <span className="admin-kit__user-value">{user.status.label}</span>
                              ) : null}
                            </td>
                            {hasActions ? (
                              <td>
                                <div className="admin-kit__user-controls">
                                  {renderUserActions
                                    ? renderUserActions(user, {
                                        reload: load,
                                        isPending: pendingUserId === user.id,
                                      })
                                    : null}
                                </div>
                              </td>
                            ) : null}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()
            : null}
          {Math.max(1, Math.ceil(result.total / result.pageSize)) > 1 ? (
            <nav className="admin-kit__pagination" aria-label="User pagination">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Previous
              </button>
              <span>
                Page {page} of {Math.max(1, Math.ceil(result.total / result.pageSize))}
              </span>
              <button
                type="button"
                disabled={page >= Math.max(1, Math.ceil(result.total / result.pageSize))}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </nav>
          ) : null}
        </>
      )}
    </section>
  );
}
