"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminPanelStateView = AdminPanelStateView;
const jsx_runtime_1 = require("react/jsx-runtime");
/** Accessible, framework-style-neutral state surface for adapter-backed panels. */
function AdminPanelStateView({ state, className }) {
    if (state.kind === 'ready')
        return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: state.children });
    if (state.kind === 'loading') {
        return (0, jsx_runtime_1.jsx)("p", { "aria-live": "polite", className: ['admin-kit__state', className].filter(Boolean).join(' '), children: state.label ?? 'Loading…' });
    }
    if (state.kind === 'empty') {
        return ((0, jsx_runtime_1.jsxs)("div", { className: ['admin-kit__state', className].filter(Boolean).join(' '), role: "status", children: [(0, jsx_runtime_1.jsx)("strong", { children: state.title }), state.detail ? (0, jsx_runtime_1.jsx)("p", { children: state.detail }) : null] }));
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: ['admin-kit__state', 'admin-kit__state--error', className].filter(Boolean).join(' '), role: "alert", children: [(0, jsx_runtime_1.jsx)("strong", { children: state.title ?? 'Unable to load this section' }), (0, jsx_runtime_1.jsx)("p", { children: state.detail }), state.onRetry ? (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: state.onRetry, children: "Try again" }) : null] }));
}
