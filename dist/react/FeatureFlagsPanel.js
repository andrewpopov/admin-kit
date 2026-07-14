"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureFlagsPanel = FeatureFlagsPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const core_1 = require("../core");
const AdminPanelState_1 = require("./AdminPanelState");
const sourceLabel = {
    store: "Store override",
    environment: "Environment controlled",
    default: "Default value",
    "store-error-policy": "Store unavailable policy",
};
/** A source-aware flag panel that never offers a misleading mutable control. */
function FeatureFlagsPanel({ adapter, className }) {
    const [snapshot, setSnapshot] = (0, react_1.useState)();
    const [error, setError] = (0, react_1.useState)();
    const [pendingKey, setPendingKey] = (0, react_1.useState)();
    const load = async () => {
        setError(undefined);
        try {
            setSnapshot((0, core_1.validateAdminFeatureFlagsSnapshot)(await adapter.list()));
        }
        catch (reason) {
            setError(reason instanceof Error
                ? reason.message
                : "Unable to load feature flags.");
        }
    };
    (0, react_1.useEffect)(() => {
        void load();
    }, [adapter]);
    if (error)
        return ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: error, onRetry: () => void load() }, className: className }));
    if (!snapshot)
        return ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "loading", label: "Loading feature flags…" }, className: className }));
    const setEnabled = async (key, enabled) => {
        if (!adapter.setEnabled)
            return;
        setPendingKey(key);
        setError(undefined);
        try {
            await adapter.setEnabled({ key, enabled });
            await load();
        }
        catch (reason) {
            setError(reason instanceof Error
                ? reason.message
                : "Unable to update the feature flag.");
        }
        finally {
            setPendingKey(undefined);
        }
    };
    return ((0, jsx_runtime_1.jsxs)("section", { className: ["admin-kit__flags", className].filter(Boolean).join(" "), "aria-label": "Feature flags", children: [(0, jsx_runtime_1.jsxs)("header", { className: "admin-kit__flags-header", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Feature flags" }), (0, jsx_runtime_1.jsxs)("p", { children: ["Store health: ", (0, jsx_runtime_1.jsx)("strong", { children: snapshot.storeHealth })] }), snapshot.storeHealthDetail ? ((0, jsx_runtime_1.jsx)("p", { role: "status", children: snapshot.storeHealthDetail })) : null] }), (0, jsx_runtime_1.jsx)("ul", { className: "admin-kit__flags-list", children: snapshot.flags.map((flag) => {
                    const canMutate = flag.mutable &&
                        snapshot.storeHealth === "healthy" &&
                        Boolean(adapter.setEnabled);
                    const controlId = `admin-kit-flag-${flag.key}`;
                    return ((0, jsx_runtime_1.jsxs)("li", { className: "admin-kit__flag", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: controlId, children: flag.label }), (0, jsx_runtime_1.jsx)("code", { children: flag.key }), flag.description ? (0, jsx_runtime_1.jsx)("p", { children: flag.description }) : null, (0, jsx_runtime_1.jsxs)("p", { className: "admin-kit__flag-source", children: ["Source: ", sourceLabel[flag.source]] })] }), (0, jsx_runtime_1.jsx)("input", { "aria-label": `Set ${flag.label} ${flag.enabled ? "off" : "on"}`, checked: flag.enabled, disabled: !canMutate || pendingKey === flag.key, id: controlId, onChange: (event) => void setEnabled(flag.key, event.target.checked), type: "checkbox" })] }, flag.key));
                }) })] }));
}
