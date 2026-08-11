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

  // Scope epoch: a MONOTONIC COUNTER bumped whenever `adapter` changes
  // identity — never an identity comparison by itself. Identity alone is not
  // a real epoch: an A -> B -> back-to-the-same-A-object transition would let
  // a call queued during the FIRST A epoch pass an identity check again once
  // the SAME object becomes current a second time.
  //
  // Detected and applied during RENDER — React's sanctioned "adjust state
  // when a prop changes" pattern — rather than inside a `useEffect`. Passive
  // effects run AFTER commit, so a request from the old scope that resolves
  // in the gap between commit and the effect firing would still pass an
  // effect-based guard and write stale rows while the rendered scope label
  // already belongs to the new adapter. Resetting here lands the clear in
  // the SAME commit as the adapter swap, so a stale scope's rows, dialogs,
  // and mutation controls are never shown next to the new scope's label.
  const [epoch, setEpoch] = useState(0);
  const [prevAdapter, setPrevAdapter] = useState(adapter);
  // Mirrors `epoch` for reads from async continuations. A closure captured
  // during render only ever sees that render's `epoch` value, so an async
  // continuation needs a mutable cell that is genuinely current when it
  // reads it after an `await` — never the frozen `epoch` binding from
  // whichever render created the closure. Written ONLY here, synchronously
  // during render (never in an effect), so it is authoritative before this
  // render commits.
  const epochRef = useRef(0);
  if (prevAdapter !== adapter) {
    setPrevAdapter(adapter);
    const nextEpoch = epoch + 1;
    setEpoch(nextEpoch);
    epochRef.current = nextEpoch;
    setSessions(undefined);
    setLoadError(undefined);
    setActionError(undefined);
    setPendingId(undefined);
    setRevokeTarget(undefined);
    setConfirmBulk(false);
  }

  const load = async () => {
    // A retained `reload` callback (handed to `renderSessionActions`) can be
    // called long after its scope changed. Check authority BEFORE touching
    // any shared state: incrementing `latestLoadId` or clearing `loadError`
    // for a stale scope would corrupt the CURRENT scope's own pending load
    // or wipe its error.
    const forAdapter = adapter;
    const forEpoch = epoch;
    if (forEpoch !== epochRef.current) return;
    const loadId = ++latestLoadId.current;
    setLoadError(undefined);
    try {
      const next = validateAdminSessions(await forAdapter.list());
      if (loadId === latestLoadId.current && forEpoch === epochRef.current) {
        setSessions(next);
      }
    } catch (reason) {
      if (loadId === latestLoadId.current && forEpoch === epochRef.current) {
        setLoadError(reason instanceof Error ? reason.message : "Unable to load active sessions.");
      }
    }
  };

  useEffect(() => {
    void load();
    return () => {
      latestLoadId.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter]);

  const revoke = async (sessionId: string) => {
    if (!adapter.revoke) return;
    const forEpoch = epoch;
    if (forEpoch !== epochRef.current) return;
    setPendingId(sessionId);
    setActionError(undefined);
    try {
      await adapter.revoke.execute({ sessionId });
      if (forEpoch !== epochRef.current) return;
      await load();
      if (forEpoch === epochRef.current) setRevokeTarget(undefined);
    } catch (reason) {
      if (forEpoch === epochRef.current) {
        setActionError(reason instanceof Error ? reason.message : "Unable to revoke the session.");
        setRevokeTarget(undefined);
      }
    } finally {
      if (forEpoch === epochRef.current) setPendingId(undefined);
    }
  };

  const bulkRevoke = async () => {
    if (!adapter.bulkRevoke) return;
    const forEpoch = epoch;
    if (forEpoch !== epochRef.current) return;
    setPendingId("__bulk__");
    setActionError(undefined);
    try {
      await adapter.bulkRevoke.execute();
      if (forEpoch !== epochRef.current) return;
      await load();
      if (forEpoch === epochRef.current) setConfirmBulk(false);
    } catch (reason) {
      if (forEpoch === epochRef.current) {
        setActionError(reason instanceof Error ? reason.message : "Unable to revoke sessions.");
        setConfirmBulk(false);
      }
    } finally {
      if (forEpoch === epochRef.current) setPendingId(undefined);
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
