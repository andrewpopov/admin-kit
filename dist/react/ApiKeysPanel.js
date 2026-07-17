"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeysPanel = ApiKeysPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const core_1 = require("../core");
const AdminConfirmationDialog_1 = require("./AdminConfirmationDialog");
const AdminPanelState_1 = require("./AdminPanelState");
/** Lists safe metadata and reveals a raw secret only from a create/rotate response. */
function ApiKeysPanel({ adapter, title = "API keys", createInput, renderCreate, renderEdit, renderKeys, renderPosture, renderShortcuts, className, dialogClassName, formatTimestamp, }) {
    const [keys, setKeys] = (0, react_1.useState)();
    const [secret, setSecret] = (0, react_1.useState)();
    const [loadError, setLoadError] = (0, react_1.useState)();
    const [actionError, setActionError] = (0, react_1.useState)();
    const [pending, setPending] = (0, react_1.useState)();
    const [copyStatus, setCopyStatus] = (0, react_1.useState)();
    const [confirmation, setConfirmation] = (0, react_1.useState)();
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
    if (loadError && !keys)
        return ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: loadError, onRetry: () => void load() }, className: className }));
    if (!keys)
        return ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "loading", label: "Loading API keys…" }, className: className }));
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
    return ((0, jsx_runtime_1.jsxs)("section", { className: ["admin-kit__keys", className].filter(Boolean).join(" "), "aria-label": title, children: [(0, jsx_runtime_1.jsx)("h2", { children: title }), loadError ? ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: loadError, onRetry: () => void load() } })) : null, actionError ? (0, jsx_runtime_1.jsx)("p", { className: "admin-kit__action-error", role: "alert", children: actionError }) : null, secret ? ((0, jsx_runtime_1.jsxs)("div", { className: "admin-kit__secret", role: "alert", children: [(0, jsx_runtime_1.jsx)("strong", { children: "Copy this secret now. It will not be shown again." }), (0, jsx_runtime_1.jsx)("code", { children: secret }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => void copySecret(), children: "Copy secret" }), copyStatus ? (0, jsx_runtime_1.jsx)("span", { "aria-live": "polite", children: copyStatus }) : null, (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setSecret(undefined), children: "I copied it" })] })) : null, renderPosture && postureControls ? renderPosture(postureControls) : null, renderShortcuts && postureControls ? renderShortcuts(postureControls) : null, renderCreate ? (renderCreate({
                create,
                pending: pending === "create",
            })) : createInput !== undefined ? ((0, jsx_runtime_1.jsx)("button", { type: "button", disabled: pending === "create", onClick: () => void create(createInput), children: "Create API key" })) : null, renderKeys ? renderKeys({
                keys: lifecycleKeys,
                requestRevoke,
                requestRotate,
                update: adapter.update ? update : undefined,
                pendingKeyId: pending === "create" ? undefined : pending,
            }) : (0, jsx_runtime_1.jsx)("ul", { className: "admin-kit__keys-list", children: lifecycleKeys.map((key) => ((0, jsx_runtime_1.jsxs)("li", { children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: key.name }), (0, jsx_runtime_1.jsx)("code", { children: key.maskedKey }), (0, jsx_runtime_1.jsxs)("p", { children: [key.state, " \u00B7 scopes: ", key.scopes.join(", ") || "none", " \u00B7 last used: ", key.lastUsedAt ? (0, core_1.formatAdminTimestamp)(key.lastUsedAt, formatTimestamp) : "never", " \u00B7 expires:", " ", key.expiresAt ? (0, core_1.formatAdminTimestamp)(key.expiresAt, formatTimestamp) : "never"] }), key.details?.length ? ((0, jsx_runtime_1.jsx)("dl", { className: "admin-kit__key-details", children: key.details.map((detail) => (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("dt", { children: detail.label }), (0, jsx_runtime_1.jsx)("dd", { children: detail.value })] }, detail.label)) })) : null] }), key.state === "active" ? ((0, jsx_runtime_1.jsxs)("div", { className: "admin-kit__key-actions", children: [adapter.rotate ? ((0, jsx_runtime_1.jsx)("button", { type: "button", disabled: pending === key.id, onClick: () => requestRotate?.(key), children: "Rotate" })) : null, adapter.update && renderEdit ? renderEdit({ key, update: (input) => update(key, input), pending: pending === key.id }) : null, (0, jsx_runtime_1.jsx)("button", { type: "button", disabled: pending === key.id, onClick: () => requestRevoke(key), children: "Revoke" })] })) : null] }, key.id))) }), (0, jsx_runtime_1.jsx)(AdminConfirmationDialog_1.AdminConfirmationDialog, { open: Boolean(confirmation), className: dialogClassName, title: confirmation?.action === "rotate" ? "Rotate API key" : "Revoke API key", description: confirmation?.action === "rotate"
                    ? "The current credential will stop working. Copy the replacement secret immediately after rotating it."
                    : "This credential will stop working immediately and cannot be restored.", confirmLabel: confirmation?.action === "rotate" ? "Rotate key" : "Revoke key", danger: confirmation?.action === "revoke", pending: Boolean(confirmation) && pending === confirmation?.key.id, onCancel: () => setConfirmation(undefined), onConfirm: () => void confirmAction() })] }));
}
