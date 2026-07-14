"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminActionButton = AdminActionButton;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * Shared action skin for host-rendered controls. Hosts still own labels,
 * disabled state, and server-authorized behavior.
 */
function AdminActionButton({ className, tone = "neutral", type = "button", ...props }) {
    return (0, jsx_runtime_1.jsx)("button", { ...props, className: ["admin-kit__button", `admin-kit__button--${tone}`, className].filter(Boolean).join(" "), type: type });
}
