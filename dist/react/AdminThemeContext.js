"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminThemeProvider = AdminThemeProvider;
exports.useAdminPaletteClass = useAdminPaletteClass;
exports.AdminThemeLayer = AdminThemeLayer;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const AdminThemeContext = (0, react_1.createContext)(undefined);
const AdminPaletteContext = (0, react_1.createContext)("core");
/**
 * Lets portaled surfaces learn which theme boundary they were opened from.
 * An omitted palette inherits the surrounding one, so a nested Admin Kit
 * boundary never resets an opted-in palette back to the default.
 */
function AdminThemeProvider({ theme, palette, children, }) {
    const inheritedPalette = (0, react_1.useContext)(AdminPaletteContext);
    return ((0, jsx_runtime_1.jsx)(AdminThemeContext.Provider, { value: theme, children: (0, jsx_runtime_1.jsx)(AdminPaletteContext.Provider, { value: palette ?? inheritedPalette, children: children }) }));
}
/**
 * The palette class a theme boundary has to carry on its own element: CSS
 * inheritance covers nested boundaries, but a portal to `document.body`
 * escapes the subtree that declares the palette.
 */
function useAdminPaletteClass() {
    const palette = (0, react_1.useContext)(AdminPaletteContext);
    return palette === "core" ? null : `admin-kit--palette-${palette}`;
}
/**
 * Re-enters the surrounding theme for content portaled to `document.body`.
 * Hosts rebrand by overriding public tokens on `.admin-kit.admin-kit--theme-<name>`;
 * a portal escapes that wrapper, so it carries the same classes itself. Outside
 * any AdminTheme it renders its children untouched.
 */
function AdminThemeLayer({ children }) {
    const theme = (0, react_1.useContext)(AdminThemeContext);
    const paletteClass = useAdminPaletteClass();
    if (!theme)
        return (0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: children });
    return ((0, jsx_runtime_1.jsx)("div", { className: ["admin-kit", `admin-kit--theme-${theme}`, paletteClass, "admin-kit--layer"]
            .filter(Boolean)
            .join(" "), "data-admin-kit-theme": theme, children: children }));
}
