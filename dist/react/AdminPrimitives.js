"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminCard = AdminCard;
exports.AdminField = AdminField;
exports.AdminStack = AdminStack;
const jsx_runtime_1 = require("react/jsx-runtime");
/** A canonical container for product-specific content inside an admin section. */
function AdminCard({ title, description, actions, children, className }) {
    return ((0, jsx_runtime_1.jsxs)("section", { className: ["admin-kit__card", className].filter(Boolean).join(" "), children: [title || description || actions ? ((0, jsx_runtime_1.jsxs)("header", { className: "admin-kit__card-header", children: [(0, jsx_runtime_1.jsxs)("div", { children: [title ? (0, jsx_runtime_1.jsx)("h2", { children: title }) : null, description ? (0, jsx_runtime_1.jsx)("p", { children: description }) : null] }), actions ? (0, jsx_runtime_1.jsx)("div", { className: "admin-kit__card-actions", children: actions }) : null] })) : null, (0, jsx_runtime_1.jsx)("div", { className: "admin-kit__card-content", children: children })] }));
}
/** Labels extension controls with the same spacing, hierarchy, and error treatment. */
function AdminField({ label, hint, error, children, className }) {
    return ((0, jsx_runtime_1.jsxs)("label", { className: ["admin-kit__field", className].filter(Boolean).join(" "), children: [(0, jsx_runtime_1.jsx)("span", { className: "admin-kit__field-label", children: label }), children, hint ? (0, jsx_runtime_1.jsx)("small", { className: "admin-kit__field-hint", children: hint }) : null, error ? (0, jsx_runtime_1.jsx)("small", { className: "admin-kit__field-error", role: "alert", children: error }) : null] }));
}
/** A stable vertical rhythm for custom extension content. */
function AdminStack({ children, gap = "md", className }) {
    return (0, jsx_runtime_1.jsx)("div", { className: ["admin-kit__stack", `admin-kit__stack--${gap}`, className].filter(Boolean).join(" "), children: children });
}
