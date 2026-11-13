"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminWorkspace = AdminWorkspace;
const jsx_runtime_1 = require("react/jsx-runtime");
const AdminPanelHeader_1 = require("./AdminPanelHeader");
/** Standard semantic framing for dense administrative and operational views. */
function AdminWorkspace({ as = "main", title, showHeader = true, presentation = "framed", description, actions, summary, toolbar, collapsible, children, className, }) {
    const Workspace = as;
    const panelLed = presentation === "panel-led";
    const collapsibleHeader = showHeader && !panelLed && collapsible;
    return ((0, jsx_runtime_1.jsxs)(Workspace, { className: [
            "admin-kit",
            "admin-kit--theme-core",
            "admin-kit__workspace",
            panelLed ? "admin-kit__workspace--panel-led" : null,
            className,
        ]
            .filter(Boolean)
            .join(" "), "data-admin-kit-theme": "core", children: [collapsibleHeader ? ((0, jsx_runtime_1.jsx)(AdminPanelHeader_1.AdminPanelHeader, { actions: actions, collapsible: collapsible, detail: description ? (0, jsx_runtime_1.jsx)("p", { children: description }) : null, presentation: "page", summary: summary, title: title, toolbar: toolbar })) : null, showHeader && !panelLed && !collapsible ? ((0, jsx_runtime_1.jsxs)("header", { className: "admin-kit__workspace-header", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h1", { children: title }), description ? (0, jsx_runtime_1.jsx)("p", { children: description }) : null] }), actions ? (0, jsx_runtime_1.jsx)("div", { className: "admin-kit__workspace-actions", children: actions }) : null] })) : null, summary && !collapsibleHeader ? ((0, jsx_runtime_1.jsx)("section", { className: "admin-kit__workspace-summary", "aria-label": `${title} summary`, children: summary })) : null, toolbar && !collapsibleHeader ? ((0, jsx_runtime_1.jsx)("div", { className: "admin-kit__workspace-toolbar", children: toolbar })) : null, (0, jsx_runtime_1.jsx)("section", { className: [
                    "admin-kit__workspace-content",
                    panelLed ? "admin-kit__workspace-content--bare" : null,
                ]
                    .filter(Boolean)
                    .join(" "), "aria-label": title, children: children })] }));
}
