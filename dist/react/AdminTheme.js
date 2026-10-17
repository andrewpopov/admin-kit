"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminTheme = AdminTheme;
const jsx_runtime_1 = require("react/jsx-runtime");
const AdminThemeContext_1 = require("./AdminThemeContext");
/** Applies the canonical Admin Kit visual system to a complete admin surface. */
function AdminTheme({ theme = "core", palette, as = "div", className, children, }) {
    const Theme = as;
    const paletteClass = palette ? `admin-kit--palette-${palette}` : null;
    return ((0, jsx_runtime_1.jsx)(Theme, { className: ["admin-kit", `admin-kit--theme-${theme}`, paletteClass, className]
            .filter(Boolean)
            .join(" "), "data-admin-kit-theme": theme, children: (0, jsx_runtime_1.jsx)(AdminThemeContext_1.AdminThemeProvider, { theme: theme, palette: palette, children: children }) }));
}
