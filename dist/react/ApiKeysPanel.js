"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeysPanel = ApiKeysPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const core_1 = require("../core");
const AdminPanelState_1 = require("./AdminPanelState");
/** Lists safe metadata and reveals a raw secret only from a create/rotate response. */
function ApiKeysPanel({ adapter, createInput, }) {
    const [keys, setKeys] = (0, react_1.useState)();
    const [secret, setSecret] = (0, react_1.useState)();
    const [error, setError] = (0, react_1.useState)();
    const [pending, setPending] = (0, react_1.useState)();
    const load = async () => {
        setError(undefined);
        try {
            setKeys((0, core_1.validateAdminApiKeys)(await adapter.list()));
        }
        catch (reason) {
            setError(reason instanceof Error ? reason.message : "Unable to load API keys.");
        }
    };
    (0, react_1.useEffect)(() => {
        void load();
    }, [adapter]);
    if (error)
        return ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: error, onRetry: () => void load() } }));
    if (!keys)
        return ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "loading", label: "Loading API keys…" } }));
    const create = async () => {
        setPending("create");
        try {
            const result = await adapter.create(createInput);
            setSecret(result.secret);
            await load();
        }
        catch (reason) {
            setError(reason instanceof Error ? reason.message : "Unable to create API key.");
        }
        finally {
            setPending(undefined);
        }
    };
    const revoke = async (keyId) => {
        if (!window.confirm("Revoke this API key? This cannot be undone."))
            return;
        setPending(keyId);
        try {
            await adapter.revoke({ keyId });
            await load();
        }
        catch (reason) {
            setError(reason instanceof Error ? reason.message : "Unable to revoke API key.");
        }
        finally {
            setPending(undefined);
        }
    };
    return ((0, jsx_runtime_1.jsxs)("section", { className: "admin-kit__keys", "aria-label": "API keys", children: [(0, jsx_runtime_1.jsx)("h2", { children: "API keys" }), secret ? ((0, jsx_runtime_1.jsxs)("div", { className: "admin-kit__secret", role: "alert", children: [(0, jsx_runtime_1.jsx)("strong", { children: "Copy this secret now. It will not be shown again." }), (0, jsx_runtime_1.jsx)("code", { children: secret }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setSecret(undefined), children: "I copied it" })] })) : null, (0, jsx_runtime_1.jsx)("button", { type: "button", disabled: pending === "create", onClick: () => void create(), children: "Create API key" }), (0, jsx_runtime_1.jsx)("ul", { className: "admin-kit__keys-list", children: keys.map((key) => ((0, jsx_runtime_1.jsxs)("li", { children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: key.name }), (0, jsx_runtime_1.jsx)("code", { children: key.maskedKey }), (0, jsx_runtime_1.jsxs)("p", { children: [key.state, " \u00B7 scopes: ", key.scopes.join(", ") || "none", " \u00B7 last used: ", key.lastUsedAt ?? "never"] })] }), key.state === "active" ? ((0, jsx_runtime_1.jsx)("button", { type: "button", disabled: pending === key.id, onClick: () => void revoke(key.id), children: "Revoke" })) : null] }, key.id))) })] }));
}
