"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminAppShell = AdminAppShell;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const AdminTheme_1 = require("./AdminTheme");
/**
 * Responsive shell for URL-owning hosts. It deliberately accepts rendered
 * navigation rather than section content so frameworks retain route ownership.
 */
function AdminAppShell({ frame, renderNavigation, children, ariaLabel = 'Administration sections', mobileNavigationLabel = 'Browse administration', theme, className, }) {
    const [mobileNavigationOpen, setMobileNavigationOpen] = (0, react_1.useState)(false);
    const closeMobileNavigation = () => setMobileNavigationOpen(false);
    return ((0, jsx_runtime_1.jsxs)(AdminTheme_1.AdminTheme, { as: "section", className: ['admin-kit__app-shell', className].filter(Boolean).join(' '), theme: theme, children: [(0, jsx_runtime_1.jsxs)("header", { className: "admin-kit__app-header", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h1", { children: frame.title }), frame.description ? (0, jsx_runtime_1.jsx)("p", { children: frame.description }) : null] }), frame.actions ? (0, jsx_runtime_1.jsx)("div", { className: "admin-kit__app-actions", children: frame.actions }) : null] }), (0, jsx_runtime_1.jsx)("button", { "aria-controls": "admin-kit-mobile-navigation", "aria-expanded": mobileNavigationOpen, className: "admin-kit__app-shell-mobile-toggle", onClick: () => setMobileNavigationOpen((open) => !open), type: "button", children: mobileNavigationLabel }), mobileNavigationOpen ? ((0, jsx_runtime_1.jsx)("nav", { "aria-label": ariaLabel, className: "admin-kit__app-shell-mobile-navigation", id: "admin-kit-mobile-navigation", children: renderNavigation({ idPrefix: 'admin-kit-mobile', onNavigate: closeMobileNavigation }) })) : null, (0, jsx_runtime_1.jsxs)("div", { className: "admin-kit__app-shell-body", children: [(0, jsx_runtime_1.jsx)("aside", { className: "admin-kit__app-shell-navigation", children: (0, jsx_runtime_1.jsx)("nav", { "aria-label": ariaLabel, children: renderNavigation({ idPrefix: 'admin-kit-desktop' }) }) }), (0, jsx_runtime_1.jsx)("main", { className: "admin-kit__app-shell-content", children: children })] })] }));
}
