"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminTheme = AdminTheme;
const jsx_runtime_1 = require("react/jsx-runtime");
/** Applies the canonical Admin Kit visual system to a complete admin surface. */
function AdminTheme({ theme = "core", as = "div", className, children }) {
    const Theme = as;
    return ((0, jsx_runtime_1.jsx)(Theme, { className: ["admin-kit", `admin-kit--theme-${theme}`, className].filter(Boolean).join(" "), "data-admin-kit-theme": theme, children: children }));
}
