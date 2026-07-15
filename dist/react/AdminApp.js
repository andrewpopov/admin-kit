"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminApp = AdminApp;
const jsx_runtime_1 = require("react/jsx-runtime");
const core_1 = require("../core");
const AdminPortal_1 = require("./AdminPortal");
const AdminTheme_1 = require("./AdminTheme");
/**
 * The canonical Admin Kit application shell. Use this for every host
 * administration area; the lower-level AdminPortal remains available only for
 * product-specific navigation that has no capability registry.
 */
function AdminApp({ frame, theme, className, ...portalProps }) {
    (0, core_1.defineAdminApp)({ groups: portalProps.groups });
    return (0, jsx_runtime_1.jsxs)(AdminTheme_1.AdminTheme, { as: "section", className: "admin-kit__app", theme: theme, children: [(0, jsx_runtime_1.jsxs)("header", { className: "admin-kit__app-header", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h1", { children: frame.title }), frame.description ? (0, jsx_runtime_1.jsx)("p", { children: frame.description }) : null] }), frame.actions ? (0, jsx_runtime_1.jsx)("div", { className: "admin-kit__app-actions", children: frame.actions }) : null] }), (0, jsx_runtime_1.jsx)(AdminPortal_1.AdminPortal, { ...portalProps, className: ["admin-kit__app-portal", className].filter(Boolean).join(" "), groups: portalProps.groups })] });
}
