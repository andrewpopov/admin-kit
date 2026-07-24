"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionsPanel = SessionsPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const core_1 = require("../core");
const AdminConfirmationDialog_1 = require("./AdminConfirmationDialog");
const AdminPanelState_1 = require("./AdminPanelState");
/** Active-session administration with host-owned token and authorization semantics. */
function SessionsPanel({ adapter, title = "Active sessions", renderSessionActions, getRevokeDescription, formatTimestamp, dialogClassName, className, }) {
    const [sessions, setSessions] = (0, react_1.useState)();
    const [loadError, setLoadError] = (0, react_1.useState)();
    const [actionError, setActionError] = (0, react_1.useState)();
    const [pendingId, setPendingId] = (0, react_1.useState)();
    const [revokeTarget, setRevokeTarget] = (0, react_1.useState)();
    const [confirmBulk, setConfirmBulk] = (0, react_1.useState)(false);
    const latestLoadId = (0, react_1.useRef)(0);
    const load = async () => {
        const loadId = ++latestLoadId.current;
        setLoadError(undefined);
        try {
            const next = (0, core_1.validateAdminSessions)(await adapter.list());
            if (loadId === latestLoadId.current)
                setSessions(next);
        }
        catch (reason) {
            if (loadId === latestLoadId.current) {
                setLoadError(reason instanceof Error ? reason.message : "Unable to load active sessions.");
            }
        }
    };
    (0, react_1.useEffect)(() => {
        void load();
        return () => {
            latestLoadId.current += 1;
        };
    }, [adapter]);
    const revoke = async (sessionId) => {
        if (!adapter.revoke)
            return;
        setPendingId(sessionId);
        setActionError(undefined);
        try {
            await adapter.revoke.execute({ sessionId });
            await load();
            setRevokeTarget(undefined);
        }
        catch (reason) {
            setActionError(reason instanceof Error ? reason.message : "Unable to revoke the session.");
            setRevokeTarget(undefined);
        }
        finally {
            setPendingId(undefined);
        }
    };
    const bulkRevoke = async () => {
        if (!adapter.bulkRevoke)
            return;
        setPendingId("__bulk__");
        setActionError(undefined);
        try {
            await adapter.bulkRevoke.execute();
            await load();
            setConfirmBulk(false);
        }
        catch (reason) {
            setActionError(reason instanceof Error ? reason.message : "Unable to revoke sessions.");
            setConfirmBulk(false);
        }
        finally {
            setPendingId(undefined);
        }
    };
    if (loadError && !sessions) {
        return ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { className: className, state: { kind: "error", detail: loadError, onRetry: () => void load() } }));
    }
    if (!sessions) {
        return ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { className: className, state: { kind: "loading", label: "Loading active sessions…" } }));
    }
    const hasDetails = sessions.some((session) => session.details?.length);
    const hasActions = Boolean(renderSessionActions ||
        (adapter.revoke && sessions.some((session) => session.permissions?.canRevoke !== false)));
    const busy = pendingId !== undefined;
    return ((0, jsx_runtime_1.jsxs)("section", { className: ["admin-kit__sessions", className].filter(Boolean).join(" "), "aria-label": title, children: [(0, jsx_runtime_1.jsxs)("header", { className: "admin-kit__sessions-header", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { children: title }), (0, jsx_runtime_1.jsxs)("p", { children: [adapter.scope.label, " \u00B7 ", sessions.length, " ", sessions.length === 1 ? "session" : "sessions"] })] }), adapter.bulkRevoke && sessions.length > 0 ? ((0, jsx_runtime_1.jsx)("button", { className: "admin-kit__button admin-kit__button--danger", disabled: busy, type: "button", onClick: () => setConfirmBulk(true), children: adapter.bulkRevoke.label })) : null] }), loadError ? ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: loadError, onRetry: () => void load() } })) : null, actionError ? ((0, jsx_runtime_1.jsx)("p", { className: "admin-kit__action-error", role: "alert", children: actionError })) : null, sessions.length === 0 ? ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "empty", title: "No active sessions." } })) : ((0, jsx_runtime_1.jsx)("div", { className: "admin-kit__table-wrap admin-kit__sessions-table-wrap", children: (0, jsx_runtime_1.jsxs)("table", { className: `admin-kit__table admin-kit__sessions-table${hasDetails ? " admin-kit__sessions-table--with-details" : ""}`, children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Session" }), hasDetails ? (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Details" }) : null, (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Created" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Last active" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Expires" }), hasActions ? (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Actions" }) : null] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: sessions.map((session) => {
                                const pending = pendingId === session.id;
                                const canRevoke = Boolean(adapter.revoke && session.permissions?.canRevoke !== false);
                                return ((0, jsx_runtime_1.jsxs)("tr", { "aria-busy": pending, children: [(0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsxs)("div", { className: "admin-kit__session-identity", children: [(0, jsx_runtime_1.jsx)("strong", { children: session.label }), session.secondaryLabel ? (0, jsx_runtime_1.jsx)("span", { children: session.secondaryLabel }) : null, session.current ? ((0, jsx_runtime_1.jsx)("span", { className: "admin-kit__session-current", children: "Current" })) : null] }) }), hasDetails ? ((0, jsx_runtime_1.jsx)("td", { children: session.details?.length ? ((0, jsx_runtime_1.jsx)("dl", { className: "admin-kit__session-details", children: session.details.map((detail) => ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("dt", { children: detail.label }), (0, jsx_runtime_1.jsx)("dd", { children: detail.value })] }, detail.label))) })) : ((0, jsx_runtime_1.jsx)("span", { className: "admin-kit__session-empty", children: "\u2014" })) })) : null, (0, jsx_runtime_1.jsx)("td", { children: (0, core_1.formatAdminTimestamp)(session.createdAt, formatTimestamp) }), (0, jsx_runtime_1.jsx)("td", { children: session.lastSeenAt
                                                ? (0, core_1.formatAdminTimestamp)(session.lastSeenAt, formatTimestamp)
                                                : "—" }), (0, jsx_runtime_1.jsx)("td", { children: session.expiresAt
                                                ? (0, core_1.formatAdminTimestamp)(session.expiresAt, formatTimestamp)
                                                : "—" }), hasActions ? ((0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsxs)("div", { className: "admin-kit__session-controls", children: [renderSessionActions
                                                        ? renderSessionActions(session, { reload: load, isPending: pending })
                                                        : null, canRevoke ? ((0, jsx_runtime_1.jsx)("button", { className: "admin-kit__button", disabled: busy, type: "button", onClick: () => setRevokeTarget(session), children: "Revoke" })) : null] }) })) : null] }, session.id));
                            }) })] }) })), adapter.revoke ? ((0, jsx_runtime_1.jsx)(AdminConfirmationDialog_1.AdminConfirmationDialog, { className: dialogClassName, open: Boolean(revokeTarget), title: "Revoke session", description: revokeTarget
                    ? (getRevokeDescription?.(revokeTarget) ??
                        `Revoke the session for ${revokeTarget.label}? That client will need to sign in again.`)
                    : "", confirmLabel: "Revoke session", danger: true, pending: Boolean(revokeTarget && pendingId === revokeTarget.id), onCancel: () => setRevokeTarget(undefined), onConfirm: () => revokeTarget && void revoke(revokeTarget.id) })) : null, adapter.bulkRevoke ? ((0, jsx_runtime_1.jsx)(AdminConfirmationDialog_1.AdminConfirmationDialog, { className: dialogClassName, open: confirmBulk, title: adapter.bulkRevoke.confirmTitle, description: adapter.bulkRevoke.confirmDescription, confirmLabel: adapter.bulkRevoke.label, danger: true, pending: pendingId === "__bulk__", onCancel: () => setConfirmBulk(false), onConfirm: () => void bulkRevoke() })) : null] }));
}
