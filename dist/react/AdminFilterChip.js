"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminFilterChip = AdminFilterChip;
const jsx_runtime_1 = require("react/jsx-runtime");
const AdminPanelHeader_1 = require("./AdminPanelHeader");
/** A removable applied-filter chip; inside a collapsed band, removing it returns focus to the band's toggle. */
function AdminFilterChip({ label, onRemove, removeLabel }) {
    const focusToggle = (0, AdminPanelHeader_1.useAdminBandFocus)();
    return ((0, jsx_runtime_1.jsxs)("span", { className: "admin-kit__filter-chip", children: [(0, jsx_runtime_1.jsx)("span", { children: label }), (0, jsx_runtime_1.jsx)("button", { "aria-label": removeLabel ?? `Remove filter: ${label}`, onClick: () => {
                    onRemove();
                    focusToggle();
                }, type: "button", children: (0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", children: "\u00D7" }) })] }));
}
