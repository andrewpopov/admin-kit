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
function FeatureFlagsPanel({ adapter, title = "Feature flags", className, }) {
    const idBase = (0, react_1.useId)();
    const [snapshot, setSnapshot] = (0, react_1.useState)();
    const [loadError, setLoadError] = (0, react_1.useState)();
    const [actionError, setActionError] = (0, react_1.useState)();
    const [pendingKey, setPendingKey] = (0, react_1.useState)();
    const latestLoadId = (0, react_1.useRef)(0);
    // Bumped only when the `adapter` prop itself changes (unlike `latestLoadId`,
    // which also advances on every ordinary reload). `setEnabled` captures this
    // at the start and re-checks it after its await: if it moved, the adapter
    // that issued the mutation is no longer current, so its reload must not
    // overwrite the new adapter's snapshot.
    const adapterEpoch = (0, react_1.useRef)(0);
    const load = async () => {
        const loadId = ++latestLoadId.current;
        setLoadError(undefined);
        try {
            const next = (0, core_1.validateAdminFeatureFlagsSnapshot)(await adapter.list());
            if (loadId === latestLoadId.current)
                setSnapshot(next);
        }
        catch (reason) {
            if (loadId === latestLoadId.current) {
                setLoadError(reason instanceof Error ? reason.message : "Unable to load feature flags.");
            }
        }
    };
    (0, react_1.useEffect)(() => {
        adapterEpoch.current += 1;
        // A failed load under the new adapter must not fall through to
        // displaying the previous adapter's snapshot.
        setSnapshot(undefined);
        void load();
        // Invalidate synchronously with the transition: without this, a request
        // in flight for the previous adapter can still resolve and pass the
        // `loadId === latestLoadId.current` check because the effect that would
        // have bumped it for the new adapter hasn't started yet.
        return () => {
            latestLoadId.current += 1;
        };
    }, [adapter]);
    if (loadError && !snapshot)
        return ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: loadError, onRetry: () => void load() }, className: className }));
    if (!snapshot)
        return ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "loading", label: "Loading feature flags…" }, className: className }));
    const setEnabled = async (key, enabled) => {
        if (!adapter.setEnabled)
            return;
        const epoch = adapterEpoch.current;
        setPendingKey(key);
        setActionError(undefined);
        try {
            await adapter.setEnabled({ key, enabled });
            if (epoch === adapterEpoch.current)
                await load();
        }
        catch (reason) {
            setActionError(reason instanceof Error ? reason.message : "Unable to update the feature flag.");
        }
        finally {
            setPendingKey(undefined);
        }
    };
    return ((0, jsx_runtime_1.jsxs)("section", { className: ["admin-kit__flags", className].filter(Boolean).join(" "), "aria-label": title, children: [(0, jsx_runtime_1.jsxs)("header", { className: "admin-kit__flags-header", children: [(0, jsx_runtime_1.jsx)("h2", { children: title }), (0, jsx_runtime_1.jsxs)("p", { children: ["Store health: ", (0, jsx_runtime_1.jsx)("strong", { children: snapshot.storeHealth })] }), snapshot.storeHealthDetail ? (0, jsx_runtime_1.jsx)("p", { role: "status", children: snapshot.storeHealthDetail }) : null] }), loadError ? ((0, jsx_runtime_1.jsx)(AdminPanelState_1.AdminPanelStateView, { state: { kind: "error", detail: loadError, onRetry: () => void load() } })) : null, actionError ? ((0, jsx_runtime_1.jsx)("p", { className: "admin-kit__action-error", role: "alert", children: actionError })) : null, (0, jsx_runtime_1.jsx)("ul", { className: "admin-kit__flags-list", children: snapshot.flags.map((flag) => {
                    const canMutate = flag.mutable && snapshot.storeHealth === "healthy" && Boolean(adapter.setEnabled);
                    const controlId = `${idBase}-flag-${flag.key}`;
                    return ((0, jsx_runtime_1.jsxs)("li", { className: "admin-kit__flag", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: controlId, children: flag.label }), (0, jsx_runtime_1.jsx)("code", { children: flag.key }), flag.description ? (0, jsx_runtime_1.jsx)("p", { children: flag.description }) : null, (0, jsx_runtime_1.jsxs)("p", { className: "admin-kit__flag-source", children: ["Source: ", sourceLabel[flag.source]] })] }), (0, jsx_runtime_1.jsx)("input", { checked: flag.enabled, disabled: !canMutate || pendingKey === flag.key, id: controlId, onChange: (event) => void setEnabled(flag.key, event.target.checked), type: "checkbox" })] }, flag.key));
                }) })] }));
}
