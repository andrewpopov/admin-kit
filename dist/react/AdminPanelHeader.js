"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminFrameHeadingProvider = void 0;
exports.AdminPanelHeader = AdminPanelHeader;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const AdminFrameHeadingContext = (0, react_1.createContext)(false);
/**
 * Marks that an application frame already renders the page's `h1`, so a
 * `presentation="page"` panel title becomes an `h2` (same look) and the page
 * keeps exactly one `h1`.
 */
exports.AdminFrameHeadingProvider = AdminFrameHeadingContext.Provider;
/**
 * One title/action band shared by standalone panels and panel-led pages.
 * Renders nothing when `presentation="none"` — see the contract documented
 * on {@link AdminPanelHeaderPresentation}.
 */
function AdminPanelHeader({ title, presentation = "section", detail, actions, toolbar, className, }) {
    const frameOwnsH1 = (0, react_1.useContext)(AdminFrameHeadingContext);
    if (presentation === "none")
        return null;
    const Heading = (presentation === "page" && !frameOwnsH1 ? "h1" : "h2");
    return ((0, jsx_runtime_1.jsxs)("header", { className: [
            "admin-kit__panel-header",
            `admin-kit__panel-header--${presentation}`,
            toolbar ? "admin-kit__panel-header--with-toolbar" : undefined,
            className,
        ]
            .filter(Boolean)
            .join(" "), children: [(0, jsx_runtime_1.jsxs)("div", { className: "admin-kit__panel-header-main", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(Heading, { children: title }), detail] }), actions ? (0, jsx_runtime_1.jsx)("div", { className: "admin-kit__panel-header-actions", children: actions }) : null] }), toolbar ? (0, jsx_runtime_1.jsx)("div", { className: "admin-kit__panel-toolbar", children: toolbar }) : null] }));
}
