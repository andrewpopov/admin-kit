"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminThemeProvider = AdminThemeProvider;
exports.AdminThemeLayer = AdminThemeLayer;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const AdminThemeContext = (0, react_1.createContext)(undefined);
/** Lets portaled surfaces learn which theme boundary they were opened from. */
function AdminThemeProvider({ theme, children, }) {
    return (0, jsx_runtime_1.jsx)(AdminThemeContext.Provider, { value: theme, children: children });
}
/**
 * Re-enters the surrounding theme for content portaled to `document.body`.
 * Hosts rebrand by overriding public tokens on `.admin-kit.admin-kit--theme-<name>`;
 * a portal escapes that wrapper, so it carries the same classes itself. Outside
 * any AdminTheme it renders its children untouched.
 */
function AdminThemeLayer({ children }) {
    const theme = (0, react_1.useContext)(AdminThemeContext);
    if (!theme)
        return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: children });
    return ((0, jsx_runtime_1.jsx)("div", { className: `admin-kit admin-kit--theme-${theme} admin-kit--layer`, "data-admin-kit-theme": theme, children: children }));
}
