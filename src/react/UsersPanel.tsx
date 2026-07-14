import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  type AdminPage,
  type AdminPageQuery,
  type AdminUserSummary,
  type AdminUsersAdapter,
} from "../core";
import { AdminPanelStateView } from "./AdminPanelState";

export interface UsersPanelProps<User extends AdminUserSummary> {
  adapter: AdminUsersAdapter<User>;
  pageSize?: number;
  query?: Omit<AdminPageQuery, "page" | "pageSize">;
  /** Opt in when the host adapter maps search text into its list query. */
  search?: false | { label?: string; placeholder?: string };
  renderHeaderActions?: (context: {
    reload: () => Promise<void>;
    isLoading: boolean;
  }) => ReactNode;
  renderUserActions?: (
    user: User,
    context: { reload: () => Promise<void>; isPending: boolean },
  ) => ReactNode;
}

/**
 * A paged, adapter-backed user directory. It only owns normalized role and
 * status changes; hosts keep product-specific fields and destructive flows.
 */
export function UsersPanel<User extends AdminUserSummary>({
  adapter,
  pageSize = 25,
  query,
  search: searchOptions = false,
  renderHeaderActions,
  renderUserActions,
}: UsersPanelProps<User>) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(query?.search ?? "");
  const [result, setResult] = useState<AdminPage<User>>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<string>();
  const latestLoadId = useRef(0);

  const load = async () => {
    const loadId = ++latestLoadId.current;
    setIsLoading(true);
    setError(undefined);
    try {
      const nextResult = await adapter.list({
        ...query,
        search: search || undefined,
        page,
        pageSize,
      });
      if (loadId === latestLoadId.current) setResult(nextResult);
    } catch (reason) {
      if (loadId === latestLoadId.current) {
        setError(reason instanceof Error ? reason.message : "Unable to load users.");
      }
    } finally {
      if (loadId === latestLoadId.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [adapter, page, pageSize, query?.search, search]);

  useEffect(() => {
    setSearch(query?.search ?? "");
  }, [query?.search]);

  const setSearchAndResetPage = (value: string) => {
    setPage(1);
    setSearch(value);
  };

  const updateRole = async (userId: string, role: string) => {
    if (!adapter.setRole) return;
    setPendingUserId(userId);
    setError(undefined);
    try {
      await adapter.setRole.execute({ userId, role });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update the user role.");
    } finally {
      setPendingUserId(undefined);
    }
  };

  const updateStatus = async (userId: string, status: string) => {
    if (!adapter.setStatus) return;
    setPendingUserId(userId);
    setError(undefined);
    try {
      await adapter.setStatus.execute({ userId, status });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update the user status.");
    } finally {
      setPendingUserId(undefined);
    }
  };

  return (
    <section className="admin-kit__users" aria-label="Users">
      <header className="admin-kit__users-header">
        <div>
          <h2>Users</h2>
          {result ? <p>{result.total} {result.total === 1 ? "user" : "users"}</p> : null}
        </div>
        {renderHeaderActions ? renderHeaderActions({ reload: load, isLoading }) : null}
      </header>
      {searchOptions !== false ? (
        <label className="admin-kit__users-search">
          <span>{searchOptions.label ?? "Search users"}</span>
          <input
            onChange={(event) => setSearchAndResetPage(event.target.value)}
            placeholder={searchOptions.placeholder ?? "Search by name or email"}
            type="search"
            value={search}
          />
        </label>
      ) : null}
      {error ? (
        <AdminPanelStateView state={{ kind: "error", detail: error, onRetry: () => void load() }} />
      ) : !result ? (
        <AdminPanelStateView state={{ kind: "loading", label: "Loading users…" }} />
      ) : result.items.length === 0 ? (
        <AdminPanelStateView state={{ kind: "empty", title: "No users found." }} />
      ) : (
        <>
          <ul className="admin-kit__users-list">
            {result.items.map((user) => (
              <li className="admin-kit__user" key={user.id} aria-busy={pendingUserId === user.id}>
                <div className="admin-kit__user-identity">
                  <strong>{user.label}</strong>
                  {user.secondaryLabel ? <span>{user.secondaryLabel}</span> : null}
                  {user.badges?.length ? <span>{user.badges.join(" · ")}</span> : null}
                  {user.details?.length ? (
                    <dl className="admin-kit__user-details">
                      {user.details.map((detail) => (
                        <div key={detail.label}>
                          <dt>{detail.label}</dt>
                          <dd>{detail.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </div>
                <div className="admin-kit__user-controls">
                  {user.role && !(adapter.roles?.length && adapter.setRole) ? <span className="admin-kit__user-value">{user.role.label}</span> : null}
                  {user.status && !(adapter.statuses?.length && adapter.setStatus) ? <span className="admin-kit__user-value">{user.status.label}</span> : null}
                  {adapter.roles?.length && adapter.setRole && user.role ? (
                    <label>
                      <span>Role</span>
                      <select
                        aria-label={`Role for ${user.label}`}
                        disabled={pendingUserId === user.id}
                        value={user.role.value}
                        onChange={(event) => void updateRole(user.id, event.target.value)}
                      >
                        {adapter.roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                      </select>
                    </label>
                  ) : null}
                  {adapter.statuses?.length && adapter.setStatus && user.status ? (
                    <label>
                      <span>Status</span>
                      <select
                        aria-label={`Status for ${user.label}`}
                        disabled={pendingUserId === user.id}
                        value={user.status.value}
                        onChange={(event) => void updateStatus(user.id, event.target.value)}
                      >
                        {adapter.statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                      </select>
                    </label>
                  ) : null}
                  {renderUserActions
                    ? renderUserActions(user, {
                        reload: load,
                        isPending: pendingUserId === user.id,
                      })
                    : null}
                </div>
              </li>
            ))}
          </ul>
          {Math.max(1, Math.ceil(result.total / result.pageSize)) > 1 ? (
            <nav className="admin-kit__pagination" aria-label="User pagination">
              <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
              <span>Page {page} of {Math.max(1, Math.ceil(result.total / result.pageSize))}</span>
              <button type="button" disabled={page >= Math.max(1, Math.ceil(result.total / result.pageSize))} onClick={() => setPage(page + 1)}>Next</button>
            </nav>
          ) : null}
        </>
      )}
    </section>
  );
}
