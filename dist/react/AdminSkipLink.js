"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminContentTargetProvider = AdminContentTargetProvider;
exports.AdminContentTargetReset = AdminContentTargetReset;
exports.useAdminContentTargetId = useAdminContentTargetId;
exports.AdminSkipLink = AdminSkipLink;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const AdminLabels_1 = require("./AdminLabels");
const AdminContentTargetContext = (0, react_1.createContext)(undefined);
/** Shares one stable id between a skip link and the content region it targets. */
function AdminContentTargetProvider({ children }) {
    const id = `admin-kit-content-${(0, react_1.useId)().replace(/:/g, "")}`;
    return ((0, jsx_runtime_1.jsx)(AdminContentTargetContext.Provider, { value: id, children: children }));
}
/**
 * Hides the app's content target from descendants. A skip link has exactly one
 * target, so the portal that claims it (and the frame header) re-provide
 * `undefined`; any AdminPortal nested inside then mints its own id instead of
 * duplicating the outer one.
 */
function AdminContentTargetReset({ children }) {
    return ((0, jsx_runtime_1.jsx)(AdminContentTargetContext.Provider, { value: undefined, children: children }));
}
function useAdminContentTargetId() {
    return (0, react_1.useContext)(AdminContentTargetContext);
}
/**
 * First focusable element of an app: hidden until keyboard focus, then moves
 * focus into the content region. It focuses programmatically instead of
 * following the hash so hash-based host routers never see a URL change.
 */
function AdminSkipLink() {
    const labels = (0, AdminLabels_1.useAdminLabels)();
    const targetId = useAdminContentTargetId();
    if (!targetId)
        return null;
    return ((0, jsx_runtime_1.jsx)("a", { className: "admin-kit__skip-link", href: `#${targetId}`, onClick: (event) => {
            const target = document.getElementById(targetId);
            if (!target)
                return;
            event.preventDefault();
            target.focus();
        }, children: labels.skipToContent }));
}
