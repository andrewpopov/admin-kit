import { useEffect, useState, type ReactNode } from "react";
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
  renderUserActions,
}: UsersPanelProps<User>) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AdminPage<User>>();
  const [error, setError] = useState<string>();
  const [pendingUserId, setPendingUserId] = useState<string>();

  const load = async () => {
    setError(undefined);
    try {
      setResult(await adapter.list({ ...query, page, pageSize }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load users.");
    }
  };

  useEffect(() => {
    void load();
  }, [adapter, page, pageSize, query?.search]);

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

  if (error) {
    return <AdminPanelStateView state={{ kind: "error", detail: error, onRetry: () => void load() }} />;
  }
  if (!result) {
    return <AdminPanelStateView state={{ kind: "loading", label: "Loading users…" }} />;
  }
  if (result.items.length === 0) {
    return <AdminPanelStateView state={{ kind: "empty", title: "No users found." }} />;
  }

  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));
  return (
    <section className="admin-kit__users" aria-label="Users">
      <header className="admin-kit__users-header">
        <h2>Users</h2>
        <p>{result.total} {result.total === 1 ? "user" : "users"}</p>
      </header>
      <ul className="admin-kit__users-list">
        {result.items.map((user) => (
          <li className="admin-kit__user" key={user.id} aria-busy={pendingUserId === user.id}>
            <div className="admin-kit__user-identity">
              <strong>{user.label}</strong>
              {user.secondaryLabel ? <span>{user.secondaryLabel}</span> : null}
              {user.badges?.length ? <span>{user.badges.join(" · ")}</span> : null}
            </div>
            <div className="admin-kit__user-controls">
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
      {pageCount > 1 ? (
        <nav className="admin-kit__pagination" aria-label="User pagination">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
          <span>Page {page} of {pageCount}</span>
          <button type="button" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>Next</button>
        </nav>
      ) : null}
    </section>
  );
}
