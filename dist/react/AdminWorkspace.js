"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminWorkspace = AdminWorkspace;
const jsx_runtime_1 = require("react/jsx-runtime");
/** Standard semantic framing for dense administrative and operational views. */
function AdminWorkspace({ as = "main", title, description, actions, summary, toolbar, children, className }) {
    const Workspace = as;
    return (0, jsx_runtime_1.jsxs)(Workspace, { className: ["admin-kit__workspace", className].filter(Boolean).join(" "), children: [(0, jsx_runtime_1.jsxs)("header", { className: "admin-kit__workspace-header", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h1", { children: title }), description ? (0, jsx_runtime_1.jsx)("p", { children: description }) : null] }), actions ? (0, jsx_runtime_1.jsx)("div", { className: "admin-kit__workspace-actions", children: actions }) : null] }), summary ? (0, jsx_runtime_1.jsx)("section", { className: "admin-kit__workspace-summary", "aria-label": `${title} summary`, children: summary }) : null, toolbar ? (0, jsx_runtime_1.jsx)("div", { className: "admin-kit__workspace-toolbar", children: toolbar }) : null, (0, jsx_runtime_1.jsx)("section", { className: "admin-kit__workspace-content", "aria-label": title, children: children })] });
}
