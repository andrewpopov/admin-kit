"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeysPanel = ApiKeysPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const core_1 = require("../core");
const AdminApiKeyForm_1 = require("./AdminApiKeyForm");
const AdminConfirmationDialog_1 = require("./AdminConfirmationDialog");
const AdminPanelHeader_1 = require("./AdminPanelHeader");
const AdminPanelState_1 = require("./AdminPanelState");
/**
 * The implementation is typed to the built-in request shapes. Both union arms
 * share those shapes here (the generic arm is specialized to them at the public
 * boundary), so `adapter`, `create`, and `update` are concrete inside the body
 * and the built-in create/edit wiring needs no casts.
 */
function ApiKeysPanelImpl({ adapter, title = "API keys", headerPresentation = "section", headerActions, createInput, renderCreate, renderEdit, renderKeys, renderPosture, renderShortcuts, scopeGroups, className, dialogClassName, formatTimestamp, }) {
    const [keys, setKeys] = (0, react_1.useState)();
    const [secret, setSecret] = (0, react_1.useState)();
    const [loadError, setLoadError] = (0, react_1.useState)();
    const [actionError, setActionError] = (0, react_1.useState)();
    const [pending, setPending] = (0, react_1.useState)();
    const [copyStatus, setCopyStatus] = (0, react_1.useState)();
    const [confirmation, setConfirmation] = (0, react_1.useState)();
    // Presentation-only UI state for the built-in flows; these do not touch the
    // load/mutation lifecycle below.
    const [createOpen, setCreateOpen] = (0, react_1.useState)(false);
    const [editingKeyId, setEditingKeyId] = (0, react_1.useState)();
    const latestLoadId = (0, react_1.useRef)(0);
    // Bumped only when the `adapter` prop itself changes (unlike `latestLoadId`,
    // which also advances on every ordinary reload). Mutations capture this at
    // the start and re-check it after their await: if it moved, the adapter
    // that issued the mutation is no longer current, so its result must not be
    // published or used to trigger a reload.
    const adapterEpoch = (0, react_1.useRef)(0);
    const load = async () => {
        const loadId = ++latestLoadId.current;
        setLoadError(undefined);
        try {
            const nextKeys = (0, core_1.validateAdminApiKeys)(await adapter.list());
            if (loadId === latestLoadId.current)
                setKeys(nextKeys);
        }
        catch (reason) {
            if (loadId === latestLoadId.current) {
                setLoadError(reason instanceof Error ? reason.message : "Unable to load API keys.");
            }
        }
    };
    (0, react_1.useEffect)(() => {
        adapterEpoch.current += 1;
        // A failed load under the new adapter must not fall through to
        // displaying the previous adapter's keys.
        setKeys(undefined);
        void load();
        // Invalidate synchronously with the transition: without this, a request
        // in flight for the previous adapter can still resolve and pass the
        // `loadId === latestLoadId.current` check because the effect that would
        // have bumped it for the new adapter hasn't started yet.
        return () => { latestLoadId.current += 1; };
    }, [adapter]);
    (0, react_1.useEffect)(() => {
        setSecret(undefined);
        setCopyStatus(undefined);
    }, [adapter]);
    const panelHeader = (counts) => ((0, jsx_runtime_1.jsx)(AdminPanelHeader_1.AdminPanelHeader, { actions: headerActions, className: "admin-kit__keys-header", detail: counts ? (0, jsx_runtime_1.jsxs)("p", { children: [counts.total, " ", counts.total === 1 ? "credential" : "credentials", counts.total > 0 ? ` · ${counts.active} active` : ""] }) : null, presentation: headerPresentation, title: title }));
    if (loadError && !keys)
        return ((0, jsx_runtime_1.jsxs)("section", { className: ["admin-kit__keys", className].filter(Boolean).join(" "), "aria-label": title, children: [panelHeader(), (0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: loadError, onRetry: () => void load() } })] }));
    if (!keys)
        return ((0, jsx_runtime_1.jsxs)("section", { className: ["admin-kit__keys", className].filter(Boolean).join(" "), "aria-label": title, children: [panelHeader(), (0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "loading", label: "Loading API keys…" } })] }));
    const lifecycleKeys = keys.map((key) => ({
        ...key,
        state: (0, core_1.resolveAdminApiKeyState)(key),
    }));
    let postureControls;
    if (renderPosture || renderShortcuts) {
        const summary = (0, core_1.summarizeAdminApiKeys)(keys);
        postureControls = {
            summary,
            posture: (0, core_1.deriveAdminApiKeysPosture)(summary),
            queue: (0, core_1.deriveAdminApiKeysQueue)(summary),
        };
    }
    const create = async (input) => {
        const epoch = adapterEpoch.current;
        setPending("create");
        setActionError(undefined);
        try {
            const result = (0, core_1.validateAdminApiKeyCreated)(await adapter.create(input));
            if (epoch !== adapterEpoch.current)
                return true;
            setSecret(result.secret);
            setCopyStatus(undefined);
            await load();
            return true;
        }
        catch (reason) {
            setActionError(reason instanceof Error ? reason.message : "Unable to create API key.");
            return false;
        }
        finally {
            setPending(undefined);
        }
    };
    const update = async (key, input) => {
        if (!adapter.update)
            return false;
        const epoch = adapterEpoch.current;
        setPending(key.id);
        setActionError(undefined);
        try {
            await adapter.update({ keyId: key.id, update: input });
            if (epoch === adapterEpoch.current)
                await load();
            return true;
        }
        catch (reason) {
            setActionError(reason instanceof Error ? reason.message : "Unable to update API key.");
            return false;
        }
        finally {
            setPending(undefined);
        }
    };
    const copySecret = async () => {
        if (!secret)
            return;
        try {
            if (!navigator.clipboard)
                throw new Error("Clipboard access is unavailable.");
            await navigator.clipboard.writeText(secret);
            setCopyStatus("Copied");
        }
        catch {
            setCopyStatus("Copy failed. Select and copy the secret manually.");
        }
    };
    const confirmAction = async () => {
        if (!confirmation)
            return;
        const { action, key } = confirmation;
        const epoch = adapterEpoch.current;
        setPending(key.id);
        setActionError(undefined);
        try {
            if (action === "revoke") {
                await adapter.revoke({ keyId: key.id });
            }
            else if (adapter.rotate) {
                const result = (0, core_1.validateAdminApiKeyCreated)(await adapter.rotate({ keyId: key.id }));
                if (epoch === adapterEpoch.current) {
                    setSecret(result.secret);
                    setCopyStatus(undefined);
                }
            }
            if (epoch === adapterEpoch.current)
                await load();
            setConfirmation(undefined);
        }
        catch (reason) {
            setActionError(reason instanceof Error
                ? reason.message
                : `Unable to ${action} API key.`);
        }
        finally {
            setPending(undefined);
        }
    };
    const requestRevoke = (key) => setConfirmation({ action: "revoke", key });
    const requestRotate = adapter.rotate
        ? (key) => setConfirmation({ action: "rotate", key })
        : undefined;
    const activeCount = lifecycleKeys.filter((key) => key.state === "active").length;
    const hasDetails = lifecycleKeys.some((key) => key.details?.length);
    const hasActions = activeCount > 0;
    // Key, Scopes, State, Last used, Expires are always present; Details and
    // Actions are conditional. Used as the inline editor row's colSpan.
    const columnCount = 5 + (hasDetails ? 1 : 0) + (hasActions ? 1 : 0);
    // The built-in inline scope editor is active only when the host opted in via
    // `scopeGroups`, did not override edit rendering, and the adapter can persist
    // an update (`adapter.update` is optional — without it Save would no-op).
    const builtInEditEnabled = Boolean(scopeGroups) && !renderEdit && Boolean(adapter.update);
    return ((0, jsx_runtime_1.jsxs)("section", { className: ["admin-kit__keys", className].filter(Boolean).join(" "), "aria-label": title, children: [panelHeader({ total: lifecycleKeys.length, active: activeCount }), loadError ? ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: loadError, onRetry: () => void load() } })) : null, actionError ? (0, jsx_runtime_1.jsx)("p", { className: "admin-kit__action-error", role: "alert", children: actionError }) : null, secret ? ((0, jsx_runtime_1.jsxs)("div", { className: "admin-kit__secret", role: "alert", children: [(0, jsx_runtime_1.jsx)("strong", { children: "Copy this secret now. It will not be shown again." }), (0, jsx_runtime_1.jsx)("code", { children: secret }), (0, jsx_runtime_1.jsxs)("div", { className: "admin-kit__secret-actions", children: [(0, jsx_runtime_1.jsx)("button", { className: "admin-kit__button admin-kit__button--primary", type: "button", onClick: () => void copySecret(), children: "Copy secret" }), (0, jsx_runtime_1.jsx)("button", { className: "admin-kit__button", type: "button", onClick: () => setSecret(undefined), children: "I copied it" }), copyStatus ? (0, jsx_runtime_1.jsx)("span", { "aria-live": "polite", className: "admin-kit__secret-status", children: copyStatus }) : null] })] })) : null, renderPosture && postureControls ? renderPosture(postureControls) : null, renderShortcuts && postureControls ? renderShortcuts(postureControls) : null, renderCreate ? (renderCreate({
                create,
                pending: pending === "create",
            })) : scopeGroups ? ((0, jsx_runtime_1.jsxs)("details", { className: "admin-kit__key-create", open: createOpen, onToggle: (event) => setCreateOpen(event.currentTarget.open), children: [(0, jsx_runtime_1.jsxs)("summary", { children: [(0, jsx_runtime_1.jsx)("span", { className: "admin-kit__key-create-icon", "aria-hidden": "true", children: "\uFF0B" }), " Create a new key"] }), (0, jsx_runtime_1.jsx)("div", { className: "admin-kit__key-create-body", children: (0, jsx_runtime_1.jsx)(AdminApiKeyForm_1.AdminApiKeyForm, { mode: "create", scopeGroups: scopeGroups, pending: pending === "create", onSubmit: (request) => void create(request) }) })] })) : createInput !== undefined ? ((0, jsx_runtime_1.jsx)("button", { type: "button", disabled: pending === "create", onClick: () => void create(createInput), children: "Create API key" })) : null, renderKeys ? renderKeys({
                keys: lifecycleKeys,
                requestRevoke,
                requestRotate,
                update: adapter.update ? update : undefined,
                pendingKeyId: pending === "create" ? undefined : pending,
            }) : lifecycleKeys.length === 0 ? ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "empty", title: "No API keys yet." } })) : ((0, jsx_runtime_1.jsx)("div", { className: "admin-kit__table-wrap admin-kit__keys-table-wrap", children: (0, jsx_runtime_1.jsxs)("table", { className: `admin-kit__table admin-kit__keys-table${hasDetails ? " admin-kit__keys-table--with-details" : ""}`, children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Key" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Scopes" }), hasDetails ? (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Details" }) : null, (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "State" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Last used" }), (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Expires" }), hasActions ? (0, jsx_runtime_1.jsx)("th", { scope: "col", children: "Actions" }) : null] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: lifecycleKeys.map((key) => {
                                const isEditing = builtInEditEnabled && editingKeyId === key.id;
                                return ((0, jsx_runtime_1.jsxs)(react_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("tr", { "aria-busy": pending === key.id, className: isEditing ? "admin-kit__key-row--editing" : undefined, children: [(0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsxs)("div", { className: "admin-kit__key-identity", children: [(0, jsx_runtime_1.jsx)("strong", { children: key.name }), (0, jsx_runtime_1.jsx)("code", { children: key.maskedKey })] }) }), (0, jsx_runtime_1.jsx)("td", { children: key.scopes.length ? ((0, jsx_runtime_1.jsx)("ul", { className: "admin-kit__scope-chips", children: key.scopes.map((scope) => ((0, jsx_runtime_1.jsx)("li", { className: "admin-kit__scope-chip", children: scope }, scope))) })) : ((0, jsx_runtime_1.jsx)("span", { className: "admin-kit__key-empty", children: "\u2014" })) }), hasDetails ? ((0, jsx_runtime_1.jsx)("td", { children: key.details?.length ? ((0, jsx_runtime_1.jsx)("dl", { className: "admin-kit__key-details", children: key.details.map((detail) => (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("dt", { children: detail.label }), (0, jsx_runtime_1.jsx)("dd", { children: detail.value })] }, detail.label)) })) : ((0, jsx_runtime_1.jsx)("span", { className: "admin-kit__key-empty", children: "\u2014" })) })) : null, (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("span", { className: `admin-kit__state-pill admin-kit__state-pill--key-${key.state}`, children: key.state }) }), (0, jsx_runtime_1.jsx)("td", { className: "admin-kit__key-timestamp", children: key.lastUsedAt ? (0, core_1.formatAdminTimestamp)(key.lastUsedAt, formatTimestamp) : "never" }), (0, jsx_runtime_1.jsx)("td", { className: "admin-kit__key-timestamp", children: key.expiresAt ? (0, core_1.formatAdminTimestamp)(key.expiresAt, formatTimestamp) : "never" }), hasActions ? ((0, jsx_runtime_1.jsx)("td", { children: key.state === "active" ? ((0, jsx_runtime_1.jsxs)("div", { className: "admin-kit__key-actions", children: [builtInEditEnabled ? ((0, jsx_runtime_1.jsx)("button", { className: "admin-kit__key-edit-btn", type: "button", "aria-expanded": isEditing, "aria-controls": `admin-kit-key-edit-${key.id}`, disabled: pending === key.id, onClick: () => setEditingKeyId(isEditing ? undefined : key.id), children: "Edit" })) : null, adapter.rotate ? ((0, jsx_runtime_1.jsx)("button", { type: "button", disabled: pending === key.id, onClick: () => requestRotate?.(key), children: "Rotate" })) : null, adapter.update && renderEdit ? renderEdit({ key, update: (input) => update(key, input), pending: pending === key.id }) : null, (0, jsx_runtime_1.jsx)("button", { type: "button", disabled: pending === key.id, onClick: () => requestRevoke(key), children: "Revoke" })] })) : ((0, jsx_runtime_1.jsx)("span", { className: "admin-kit__key-empty", children: "\u2014" })) })) : null] }), isEditing && scopeGroups ? ((0, jsx_runtime_1.jsx)("tr", { className: "admin-kit__key-edit-row", children: (0, jsx_runtime_1.jsx)("td", { colSpan: columnCount, children: (0, jsx_runtime_1.jsxs)("div", { className: "admin-kit__key-edit", id: `admin-kit-key-edit-${key.id}`, role: "region", "aria-label": `Edit scopes for ${key.name}`, children: [(0, jsx_runtime_1.jsxs)("div", { className: "admin-kit__key-edit-header", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Edit scopes" }), (0, jsx_runtime_1.jsxs)("p", { children: [key.name, " \u00B7 ", key.maskedKey] })] }), (0, jsx_runtime_1.jsx)(AdminApiKeyForm_1.AdminApiKeyForm, { mode: "edit", scopeGroups: scopeGroups, pending: pending === key.id, initialScopes: key.scopes, 
                                                            // The edit form emits a scope update (narrowed from the
                                                            // form's create|update union); route it through the
                                                            // existing update handler and close on success.
                                                            onSubmit: async (request) => {
                                                                const ok = await update(key, request);
                                                                if (ok)
                                                                    setEditingKeyId(undefined);
                                                            }, onCancel: () => setEditingKeyId(undefined) })] }) }) })) : null] }, key.id));
                            }) })] }) })), (0, jsx_runtime_1.jsx)(AdminConfirmationDialog_1.AdminConfirmationDialog, { open: Boolean(confirmation), className: dialogClassName, title: confirmation?.action === "rotate" ? "Rotate API key" : "Revoke API key", description: confirmation?.action === "rotate"
                    ? "The current credential will stop working. Copy the replacement secret immediately after rotating it."
                    : "This credential will stop working immediately and cannot be restored.", confirmLabel: confirmation?.action === "rotate" ? "Rotate key" : "Revoke key", danger: confirmation?.action === "revoke", pending: Boolean(confirmation) && pending === confirmation?.key.id, onCancel: () => setConfirmation(undefined), onConfirm: () => void confirmAction() })] }));
}
/**
 * Lists safe metadata and reveals a raw secret only from a create/rotate
 * response. The public API is generic over the adapter's create/update input in
 * legacy mode; passing `scopeGroups` switches to the built-in flows and pins the
 * adapter to the standard request shapes (a mismatched adapter is a compile
 * error). The generic props are specialized to those shapes for the concretely
 * typed implementation — the two arms are otherwise identical, so this carries
 * no runtime effect and no `unknown`/`any`.
 */
function ApiKeysPanel(props) {
    return ((0, jsx_runtime_1.jsx)(ApiKeysPanelImpl, { ...props }));
}
