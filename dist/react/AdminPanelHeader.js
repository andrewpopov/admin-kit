"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminPanelHeader = AdminPanelHeader;
const jsx_runtime_1 = require("react/jsx-runtime");
/** One title/action band shared by standalone panels and panel-led pages. */
function AdminPanelHeader({ title, presentation = "section", detail, actions, toolbar, className, }) {
    const Heading = (presentation === "page" ? "h1" : "h2");
    return ((0, jsx_runtime_1.jsxs)("header", { className: [
            "admin-kit__panel-header",
            `admin-kit__panel-header--${presentation}`,
            toolbar ? "admin-kit__panel-header--with-toolbar" : undefined,
            className,
        ]
            .filter(Boolean)
            .join(" "), children: [(0, jsx_runtime_1.jsxs)("div", { className: "admin-kit__panel-header-main", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(Heading, { children: title }), detail] }), actions ? (0, jsx_runtime_1.jsx)("div", { className: "admin-kit__panel-header-actions", children: actions }) : null] }), toolbar ? (0, jsx_runtime_1.jsx)("div", { className: "admin-kit__panel-toolbar", children: toolbar }) : null] }));
}
