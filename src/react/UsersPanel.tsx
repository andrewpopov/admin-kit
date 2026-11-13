"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  type AdminPage,
  type AdminPageQuery,
  type AdminSortDirection,
  type AdminUserSummary,
  type AdminUsersAdapter,
} from "../core";
import { useAdminLabels } from "./AdminLabels";
import { AdminPanelHeader, type AdminPanelHeaderPresentation } from "./AdminPanelHeader";
import { AdminPanelStateView } from "./AdminPanelState";
import { AdminDataTable, type AdminDataTableColumn } from "./AdminDataTable";

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
  /** Persist this viewer's column widths under this key. */
  storageKey?: string;
  /** The table fills the viewport and scrolls itself under a pinned header (see `AdminDataTable` `fill`). */
  tableFill?: boolean;
}

export interface AdminUserTableColumn<User extends AdminUserSummary> {
  id: string;
  label: ReactNode;
  render: (user: User, context: AdminUserTableCellContext) => ReactNode;
  className?: string;
  headerClassName?: string;
  sortable?: boolean;
  /** Keeps concise values such as timestamps on a single line; the cell ends in an ellipsis when it is too narrow. */
  nowrap?: boolean;
  /** px. Preferred width; shrinks to `minWidth` to fit. Defaults to 160. */
  width?: number;
  /** px. The narrowest the column renders before it is hidden or the table stacks. Set it to what the cell's controls need. */
  minWidth?: number;
  /** px. The first column's (the one that fills) preferred width, default 280: other columns shrink toward their `minWidth` before it drops below this. */
  fillWidth?: number;
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

const CUSTOM_COLUMN_WIDTH = 160;

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
  storageKey,
  tableFill,
}: UsersPanelProps<User>) {
  const labels = useAdminLabels();
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
  const sortColumnId = sort?.columnId;
  const sortDirection = sort?.direction;

  const load = useCallback(async () => {
    const loadId = ++latestLoadId.current;
    setIsLoading(true);
    setLoadError(undefined);
    try {
      const querySnapshot = JSON.parse(queryKey) as Omit<
        AdminPageQuery,
        "page" | "pageSize"
      > | null;
      const nextResult = await adapter.list({
        ...(querySnapshot ?? {}),
        search: search || undefined,
        ...(sortColumnId ? { sort: sortColumnId, order: sortDirection } : {}),
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
  }, [adapter, page, pageSize, queryKey, search, sortColumnId, sortDirection]);

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
  }, [load]);

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

  const hasDetails = Boolean(result?.items.some((user) => user.details?.length));
  const tableColumns: AdminDataTableColumn<User>[] = columns?.length
    ? columns.map((column, index) => {
        const layoutClassNames = [
          column.nowrap ? "admin-kit__table-cell--nowrap" : undefined,
          column.priority ? `admin-kit__table-cell--${column.priority}` : undefined,
        ];
        const direction = sort?.columnId === column.id ? sort.direction : undefined;
        return {
          id: column.id,
          header: typeof column.label === "string" ? column.label : column.id,
          headerContent: column.label,
          headerClassName:
            [column.headerClassName, ...layoutClassNames].filter(Boolean).join(" ") || undefined,
          className: [column.className, ...layoutClassNames].filter(Boolean).join(" ") || undefined,
          priority: column.priority,
          truncate: column.nowrap,
          defaultWidth: index === 0 ? undefined : (column.width ?? CUSTOM_COLUMN_WIDTH),
          fillWidth: column.fillWidth,
          minWidth: column.minWidth ?? (index === 0 ? 200 : 96),
          sort: column.sortable
            ? {
                direction:
                  direction === "asc" ? "ascending" : direction === "desc" ? "descending" : "none",
                onSort: () => updateSort(column.id),
              }
            : undefined,
          cell: (user) =>
            column.render(user, {
              reload: load,
              isPending: pendingUserId === user.id,
              setRole: (role) => updateRole(user.id, role),
              setStatus: (status) => updateStatus(user.id, status),
            }),
        };
      })
    : [
        {
          id: "user",
          header: "User",
          minWidth: 200,
          cell: (user) => (
            <div className="admin-kit__user-identity">
              <strong>{user.label}</strong>
              {user.secondaryLabel ? <span>{user.secondaryLabel}</span> : null}
              {user.badges?.length ? <span>{user.badges.join(" · ")}</span> : null}
            </div>
          ),
        },
        ...(hasDetails
          ? [
              {
                id: "details",
                header: "Details",
                defaultWidth: 280,
                minWidth: 160,
                cell: (user: User) =>
                  user.details?.length ? (
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
                  ),
              },
            ]
          : []),
        {
          id: "role",
          header: "Role",
          defaultWidth: 168,
          minWidth: 160,
          cell: (user) =>
            adapter.roles?.length &&
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
            ) : null,
        },
        {
          id: "status",
          header: "Status",
          defaultWidth: 168,
          minWidth: 160,
          cell: (user) =>
            adapter.statuses?.length &&
            adapter.setStatus &&
            user.status &&
            user.permissions?.canChangeStatus !== false ? (
              <select
                aria-label={`Status for ${user.label}`}
                disabled={pendingUserId === user.id}
                value={user.status.value}
                onChange={(event) => void updateStatus(user.id, event.target.value)}
              >
                {adapter.statuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            ) : user.status ? (
              <span className="admin-kit__user-value">{user.status.label}</span>
            ) : null,
        },
        ...(renderUserActions
          ? [
              {
                id: "actions",
                header: "Actions",
                defaultWidth: 220,
                minWidth: 220,
                maxWidth: 220,
                resizable: false,
                cell: (user: User) => (
                  <div className="admin-kit__user-controls">
                    {renderUserActions(user, {
                      reload: load,
                      isPending: pendingUserId === user.id,
                    })}
                  </div>
                ),
              },
            ]
          : []),
      ];

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
          {presentation === "table" ? (
            <AdminDataTable
              busy={isLoading}
              className={
                columns?.length
                  ? "admin-kit__users-table admin-kit__users-table--custom"
                  : `admin-kit__users-table${hasDetails ? " admin-kit__users-table--with-details" : ""}`
              }
              columns={tableColumns}
              rowBusy={(user) => pendingUserId === user.id}
              rowKey={(user) => user.id}
              rows={result.items}
              storageKey={storageKey}
              fill={tableFill}
              wrapClassName="admin-kit__users-table-wrap"
            />
          ) : null}
          {Math.max(1, Math.ceil(result.total / result.pageSize)) > 1 ? (
            <nav className="admin-kit__pagination" aria-label="User pagination">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                {labels.previousPage}
              </button>
              <span>
                {labels.pageStatus(page, Math.max(1, Math.ceil(result.total / result.pageSize)))}
              </span>
              <button
                type="button"
                disabled={page >= Math.max(1, Math.ceil(result.total / result.pageSize))}
                onClick={() => setPage(page + 1)}
              >
                {labels.nextPage}
              </button>
            </nav>
          ) : null}
        </>
      )}
    </section>
  );
}
