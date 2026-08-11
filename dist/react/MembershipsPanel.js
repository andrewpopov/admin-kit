"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MembershipsPanel = MembershipsPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const core_1 = require("../core");
const AdminConfirmationDialog_1 = require("./AdminConfirmationDialog");
const AdminPanelState_1 = require("./AdminPanelState");
/**
 * Scoped membership administration. Hosts own identity discovery, invitation
 * delivery, authorization, inheritance, transport, and audit policy.
 */
function MembershipsPanel({ adapter, title = "Members", renderAddMember, renderMemberActions, getRemoveDescription, dialogClassName, className, }) {
    const [members, setMembers] = (0, react_1.useState)();
    const [loadError, setLoadError] = (0, react_1.useState)();
    const [actionError, setActionError] = (0, react_1.useState)();
    const [pendingMemberId, setPendingMemberId] = (0, react_1.useState)();
    const [isAdding, setIsAdding] = (0, react_1.useState)(false);
    const [removeTarget, setRemoveTarget] = (0, react_1.useState)();
    const latestLoadId = (0, react_1.useRef)(0);
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
    const [epoch, setEpoch] = (0, react_1.useState)(0);
    const [prevAdapter, setPrevAdapter] = (0, react_1.useState)(adapter);
    // Mirrors `epoch` for reads from async continuations. A closure captured
    // during render only ever sees that render's `epoch` value, so an async
    // continuation needs a mutable cell that is genuinely current when it
    // reads it after an `await` — never the frozen `epoch` binding from
    // whichever render created the closure. Written ONLY here, synchronously
    // during render (never in an effect), so it is authoritative before this
    // render commits.
    const epochRef = (0, react_1.useRef)(0);
    if (prevAdapter !== adapter) {
        setPrevAdapter(adapter);
        const nextEpoch = epoch + 1;
        setEpoch(nextEpoch);
        epochRef.current = nextEpoch;
        setMembers(undefined);
        setLoadError(undefined);
        setActionError(undefined);
        setPendingMemberId(undefined);
        setIsAdding(false);
        setRemoveTarget(undefined);
    }
    const load = async () => {
        // `load` is handed to host code as `reload` (via `renderAddMember` /
        // `renderMemberActions`) and can be retained and called long after its
        // scope changed. Check authority BEFORE touching any shared state:
        // incrementing `latestLoadId` or clearing `loadError` for a stale scope
        // would corrupt the CURRENT scope's own pending load or wipe its error.
        const forAdapter = adapter;
        const forEpoch = epoch;
        if (forEpoch !== epochRef.current)
            return;
        const loadId = ++latestLoadId.current;
        setLoadError(undefined);
        try {
            const next = (0, core_1.validateAdminMemberships)(await forAdapter.list(), forAdapter.roles);
            if (loadId === latestLoadId.current && forEpoch === epochRef.current) {
                setMembers(next);
            }
        }
        catch (reason) {
            if (loadId === latestLoadId.current && forEpoch === epochRef.current) {
                setLoadError(reason instanceof Error ? reason.message : "Unable to load members.");
            }
        }
    };
    (0, react_1.useEffect)(() => {
        void load();
        return () => {
            latestLoadId.current += 1;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [adapter]);
    const submitInvite = async (input) => {
        if (!adapter.invite)
            return false;
        const forEpoch = epoch;
        if (forEpoch !== epochRef.current)
            return false;
        setIsAdding(true);
        setActionError(undefined);
        try {
            await adapter.invite.execute(input);
            if (forEpoch !== epochRef.current)
                return true;
            await load();
            return true;
        }
        catch (reason) {
            if (forEpoch === epochRef.current) {
                setActionError(reason instanceof Error ? reason.message : "Unable to add the member.");
            }
            return false;
        }
        finally {
            if (forEpoch === epochRef.current)
                setIsAdding(false);
        }
    };
    const updateRole = async (memberId, role) => {
        if (!adapter.setRole)
            return;
        const forEpoch = epoch;
        if (forEpoch !== epochRef.current)
            return;
        setPendingMemberId(memberId);
        setActionError(undefined);
        try {
            await adapter.setRole.execute({ memberId, role });
            if (forEpoch !== epochRef.current)
                return;
            await load();
        }
        catch (reason) {
            if (forEpoch === epochRef.current) {
                setActionError(reason instanceof Error ? reason.message : "Unable to update the member role.");
            }
        }
        finally {
            if (forEpoch === epochRef.current)
                setPendingMemberId(undefined);
        }
    };
    const remove = async (memberId) => {
        if (!adapter.remove)
            return;
        const forEpoch = epoch;
        if (forEpoch !== epochRef.current)
            return;
        setPendingMemberId(memberId);
        setActionError(undefined);
        try {
            await adapter.remove.execute({ memberId });
            if (forEpoch !== epochRef.current)
                return;
            await load();
            if (forEpoch === epochRef.current)
                setRemoveTarget(undefined);
        }
        catch (reason) {
            if (forEpoch === epochRef.current) {
                setActionError(reason instanceof Error ? reason.message : "Unable to remove the member.");
                setRemoveTarget(undefined);
            }
        }
        finally {
            if (forEpoch === epochRef.current)
                setPendingMemberId(undefined);
        }
    };
    if (loadError && !members) {
        return ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { className: className, state: { kind: "error", detail: loadError, onRetry: () => void load() } }));
    }
    if (!members) {
        return ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { className: className, state: { kind: "loading", label: "Loading members…" } }));
    }
    const hasActions = Boolean(renderMemberActions ||
        (adapter.remove &&
            members.some((member) => member.mutable && member.permissions?.canRemove !== false)));
    return ((0, jsx_runtime_1.jsxs)("section", { className: ["admin-kit__memberships", className].filter(Boolean).join(" "), "aria-label": title, children: [(0, jsx_runtime_1.jsxs)("header", { className: "admin-kit__memberships-header", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h2", { children: title }), (0, jsx_runtime_1.jsxs)("p", { children: [adapter.scope.label, " \u00B7 ", members.length, " ", members.length === 1 ? "member" : "members"] })] }), renderAddMember && adapter.invite
                        ? renderAddMember({ submit: submitInvite, reload: load, isPending: isAdding })
                        : null] }), loadError ? ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: loadError, onRetry: () => void load() } })) : null, actionError ? ((0, jsx_runtime_1.jsx)("p", { className: "admin-kit__action-error", role: "alert", children: actionError })) : null, members.length === 0 ? ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "empty", title: "No members found." } })) : ((0, jsx_runtime_1.jsx)("div", { className: "admin-kit__table-wrap admin-kit__memberships-table-wrap", children: (0, jsx_runtime_1.jsxs)("table", { className: "admin-kit__table admin-kit__memberships-table", children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Member" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Access" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Role" }), hasActions ? (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Actions" }) : null] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: members.map((member) => {
                                const pending = pendingMemberId === member.memberId;
                                const canChangeRole = member.mutable &&
                                    member.permissions?.canChangeRole !== false &&
                                    Boolean(adapter.setRole);
                                const canRemove = member.mutable &&
                                    member.permissions?.canRemove !== false &&
                                    Boolean(adapter.remove);
                                const role = adapter.roles.find((candidate) => candidate.value === member.role);
                                return ((0, jsx_runtime_1.jsxs)("tr", { "aria-busy": pending, children: [(0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsxs)("div", { className: "admin-kit__membership-identity", children: [(0, jsx_runtime_1.jsx)("strong", { children: member.label }), member.secondaryLabel ? (0, jsx_runtime_1.jsx)("span", { children: member.secondaryLabel }) : null] }) }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("span", { className: "admin-kit__membership-source", children: member.source === "inherited" ? "Inherited" : "Direct" }) }), (0, jsx_runtime_1.jsx)("td", { children: canChangeRole ? ((0, jsx_runtime_1.jsx)("select", { "aria-label": `Role for ${member.label}`, disabled: pending, value: member.role, onChange: (event) => void updateRole(member.memberId, event.target.value), children: adapter.roles.map((option) => ((0, jsx_runtime_1.jsx)("option", { value: option.value, children: option.label }, option.value))) })) : ((0, jsx_runtime_1.jsx)("span", { className: `admin-kit__membership-role admin-kit__membership-role--${role.tone ?? "neutral"}`, children: role.label })) }), hasActions ? ((0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsxs)("div", { className: "admin-kit__membership-controls", children: [renderMemberActions
                                                        ? renderMemberActions(member, { reload: load, isPending: pending })
                                                        : null, canRemove ? ((0, jsx_runtime_1.jsx)("button", { className: "admin-kit__button", disabled: pending, type: "button", onClick: () => setRemoveTarget(member), children: "Remove" })) : null] }) })) : null] }, member.memberId));
                            }) })] }) })), adapter.remove ? ((0, jsx_runtime_1.jsx)(AdminConfirmationDialog_1.AdminConfirmationDialog, { className: dialogClassName, open: Boolean(removeTarget), title: "Remove member", description: removeTarget
                    ? (getRemoveDescription?.(removeTarget) ??
                        `Remove ${removeTarget.label} from ${adapter.scope.label}? Their access through this direct membership will end.`)
                    : "", confirmLabel: "Remove member", danger: true, pending: Boolean(removeTarget && pendingMemberId === removeTarget.memberId), onCancel: () => setRemoveTarget(undefined), onConfirm: () => removeTarget && void remove(removeTarget.memberId) })) : null] }));
}
