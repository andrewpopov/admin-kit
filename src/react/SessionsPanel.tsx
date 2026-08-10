"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  formatAdminTimestamp,
  validateAdminSessions,
  type AdminSessionSummary,
  type AdminSessionsAdapter,
} from "../core";
import { AdminConfirmationDialog } from "./AdminConfirmationDialog";
import { AdminPanelStateView } from "./AdminPanelState";

export interface SessionsPanelProps<Session extends AdminSessionSummary = AdminSessionSummary> {
  adapter: AdminSessionsAdapter<Session>;
  title?: string;
  renderSessionActions?: (
    session: Session,
    context: { reload: () => Promise<void>; isPending: boolean },
  ) => ReactNode;
  getRevokeDescription?: (session: Session) => string;
  formatTimestamp?: (iso: string) => string;
  dialogClassName?: string;
  className?: string;
}

/** Active-session administration with host-owned token and authorization semantics. */
export function SessionsPanel<Session extends AdminSessionSummary = AdminSessionSummary>({
  adapter,
  title = "Active sessions",
  renderSessionActions,
  getRevokeDescription,
  formatTimestamp,
  dialogClassName,
  className,
}: SessionsPanelProps<Session>) {
  const [sessions, setSessions] = useState<readonly Session[]>();
  const [loadError, setLoadError] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [pendingId, setPendingId] = useState<string>();
  const [revokeTarget, setRevokeTarget] = useState<Session>();
  const [confirmBulk, setConfirmBulk] = useState(false);
  const latestLoadId = useRef(0);
  // The adapter identity a load or mutation is currently authoritative for.
  // Compared against on every state write that lands after an `await`, so a
  // stale in-flight load or mutation — queued under a previous scope's
  // adapter — can never write into a newer scope's state.
  const currentAdapter = useRef(adapter);

  const load = async () => {
    const loadId = ++latestLoadId.current;
    const forAdapter = adapter;
    setLoadError(undefined);
    try {
      const next = validateAdminSessions(await forAdapter.list());
      if (loadId === latestLoadId.current && currentAdapter.current === forAdapter) {
        setSessions(next);
      }
    } catch (reason) {
      if (loadId === latestLoadId.current && currentAdapter.current === forAdapter) {
        setLoadError(reason instanceof Error ? reason.message : "Unable to load active sessions.");
      }
    }
  };

  useEffect(() => {
    // A new adapter is a new scope: drop the previous scope's rows, dialogs,
    // and pending state immediately instead of showing them next to the new
    // scope's label while the new load is pending (or forever, if it fails).
    currentAdapter.current = adapter;
    setSessions(undefined);
    setLoadError(undefined);
    setActionError(undefined);
    setPendingId(undefined);
    setRevokeTarget(undefined);
    setConfirmBulk(false);
    void load();
    return () => {
      latestLoadId.current += 1;
    };
  }, [adapter]);

  const revoke = async (sessionId: string) => {
    if (!adapter.revoke) return;
    const forAdapter = adapter;
    setPendingId(sessionId);
    setActionError(undefined);
    try {
      await adapter.revoke.execute({ sessionId });
      if (currentAdapter.current !== forAdapter) return;
      await load();
      setRevokeTarget(undefined);
    } catch (reason) {
      if (currentAdapter.current === forAdapter) {
        setActionError(reason instanceof Error ? reason.message : "Unable to revoke the session.");
        setRevokeTarget(undefined);
      }
    } finally {
      if (currentAdapter.current === forAdapter) setPendingId(undefined);
    }
  };

  const bulkRevoke = async () => {
    if (!adapter.bulkRevoke) return;
    const forAdapter = adapter;
    setPendingId("__bulk__");
    setActionError(undefined);
    try {
      await adapter.bulkRevoke.execute();
      if (currentAdapter.current !== forAdapter) return;
      await load();
      setConfirmBulk(false);
    } catch (reason) {
      if (currentAdapter.current === forAdapter) {
        setActionError(reason instanceof Error ? reason.message : "Unable to revoke sessions.");
        setConfirmBulk(false);
      }
    } finally {
      if (currentAdapter.current === forAdapter) setPendingId(undefined);
    }
  };

  if (loadError && !sessions) {
    return (
      <AdminPanelStateView
        className={className}
        state={{ kind: "error", detail: loadError, onRetry: () => void load() }}
      />
    );
  }
  if (!sessions) {
    return (
      <AdminPanelStateView
        className={className}
        state={{ kind: "loading", label: "Loading active sessions…" }}
      />
    );
  }

  const hasDetails = sessions.some((session) => session.details?.length);
  const hasActions = Boolean(
    renderSessionActions ||
    (adapter.revoke && sessions.some((session) => session.permissions?.canRevoke !== false)),
  );
  const busy = pendingId !== undefined;
  return (
    <section
      className={["admin-kit__sessions", className].filter(Boolean).join(" ")}
      aria-label={title}
    >
      <header className="admin-kit__sessions-header">
        <div>
          <h2>{title}</h2>
          <p>
            {adapter.scope.label} · {sessions.length}{" "}
            {sessions.length === 1 ? "session" : "sessions"}
          </p>
        </div>
        {adapter.bulkRevoke && sessions.length > 0 ? (
          <button
            className="admin-kit__button admin-kit__button--danger"
            disabled={busy}
            type="button"
            onClick={() => setConfirmBulk(true)}
          >
            {adapter.bulkRevoke.label}
          </button>
        ) : null}
      </header>
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
      {sessions.length === 0 ? (
        <AdminPanelStateView state={{ kind: "empty", title: "No active sessions." }} />
      ) : (
        <div className="admin-kit__table-wrap admin-kit__sessions-table-wrap">
          <table
            className={`admin-kit__table admin-kit__sessions-table${hasDetails ? " admin-kit__sessions-table--with-details" : ""}`}
          >
            <thead>
              <tr>
                <th scope="col">Session</th>
                {hasDetails ? <th scope="col">Details</th> : null}
                <th scope="col">Created</th>
                <th scope="col">Last active</th>
                <th scope="col">Expires</th>
                {hasActions ? <th scope="col">Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => {
                const pending = pendingId === session.id;
                const canRevoke = Boolean(
                  adapter.revoke && session.permissions?.canRevoke !== false,
                );
                return (
                  <tr key={session.id} aria-busy={pending}>
                    <td>
                      <div className="admin-kit__session-identity">
                        <strong>{session.label}</strong>
                        {session.secondaryLabel ? <span>{session.secondaryLabel}</span> : null}
                        {session.current ? (
                          <span className="admin-kit__session-current">Current</span>
                        ) : null}
                      </div>
                    </td>
                    {hasDetails ? (
                      <td>
                        {session.details?.length ? (
                          <dl className="admin-kit__session-details">
                            {session.details.map((detail) => (
                              <div key={detail.label}>
                                <dt>{detail.label}</dt>
                                <dd>{detail.value}</dd>
                              </div>
                            ))}
                          </dl>
                        ) : (
                          <span className="admin-kit__session-empty">—</span>
                        )}
                      </td>
                    ) : null}
                    <td>{formatAdminTimestamp(session.createdAt, formatTimestamp)}</td>
                    <td>
                      {session.lastSeenAt
                        ? formatAdminTimestamp(session.lastSeenAt, formatTimestamp)
                        : "—"}
                    </td>
                    <td>
                      {session.expiresAt
                        ? formatAdminTimestamp(session.expiresAt, formatTimestamp)
                        : "—"}
                    </td>
                    {hasActions ? (
                      <td>
                        <div className="admin-kit__session-controls">
                          {renderSessionActions
                            ? renderSessionActions(session, { reload: load, isPending: pending })
                            : null}
                          {canRevoke ? (
                            <button
                              className="admin-kit__button"
                              disabled={busy}
                              type="button"
                              onClick={() => setRevokeTarget(session)}
                            >
                              Revoke
                            </button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {adapter.revoke ? (
        <AdminConfirmationDialog
          className={dialogClassName}
          open={Boolean(revokeTarget)}
          title="Revoke session"
          description={
            revokeTarget
              ? (getRevokeDescription?.(revokeTarget) ??
                `Revoke the session for ${revokeTarget.label}? That client will need to sign in again.`)
              : ""
          }
          confirmLabel="Revoke session"
          danger
          pending={Boolean(revokeTarget && pendingId === revokeTarget.id)}
          onCancel={() => setRevokeTarget(undefined)}
          onConfirm={() => revokeTarget && void revoke(revokeTarget.id)}
        />
      ) : null}
      {adapter.bulkRevoke ? (
        <AdminConfirmationDialog
          className={dialogClassName}
          open={confirmBulk}
          title={adapter.bulkRevoke.confirmTitle}
          description={adapter.bulkRevoke.confirmDescription}
          confirmLabel={adapter.bulkRevoke.label}
          danger
          pending={pendingId === "__bulk__"}
          onCancel={() => setConfirmBulk(false)}
          onConfirm={() => void bulkRevoke()}
        />
      ) : null}
    </section>
  );
}
