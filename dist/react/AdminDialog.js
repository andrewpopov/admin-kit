"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminDialog = AdminDialog;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_dom_1 = require("react-dom");
const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
/**
 * Accessible form-dialog shell for host-owned create and edit workflows.
 * Hosts own fields, mutation state, and actions; the kit owns the modal
 * interaction, focus management, and responsive surface.
 */
function AdminDialog({ open, title, description, children, actions, onClose, closeDisabled = false, className, }) {
    const dialogRef = (0, react_1.useRef)(null);
    const previouslyFocusedRef = (0, react_1.useRef)(null);
    const titleId = (0, react_1.useId)();
    const descriptionId = (0, react_1.useId)();
    const [mounted, setMounted] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => setMounted(true), []);
    (0, react_1.useEffect)(() => {
        if (open) {
            previouslyFocusedRef.current ?? (previouslyFocusedRef.current = document.activeElement);
            const focusable = dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR);
            const initialFocusTarget = Array.from(focusable ?? []).find((element) => !element.classList.contains("admin-kit__dialog-close")) ?? focusable?.[0];
            initialFocusTarget?.focus();
        }
        else {
            previouslyFocusedRef.current?.focus();
            previouslyFocusedRef.current = null;
        }
    }, [open, mounted]);
    (0, react_1.useEffect)(() => {
        if (!open)
            return;
        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                if (closeDisabled)
                    return;
                event.preventDefault();
                onClose();
                return;
            }
            if (event.key !== "Tab")
                return;
            const focusable = dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR);
            if (!focusable || focusable.length === 0) {
                event.preventDefault();
                dialogRef.current?.focus();
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;
            if (event.shiftKey ? active === first || !dialogRef.current?.contains(active) : active === last) {
                event.preventDefault();
                (event.shiftKey ? last : first).focus();
            }
        };
        document.addEventListener("keydown", handleKeyDown, true);
        return () => document.removeEventListener("keydown", handleKeyDown, true);
    }, [open, onClose, closeDisabled]);
    if (!open)
        return null;
    const surface = ((0, jsx_runtime_1.jsx)("div", { className: "admin-kit__dialog-backdrop", role: "presentation", onMouseDown: (event) => {
            if (!closeDisabled && event.target === event.currentTarget)
                onClose();
        }, children: (0, jsx_runtime_1.jsxs)("section", { ref: dialogRef, "aria-describedby": description ? descriptionId : undefined, "aria-labelledby": titleId, "aria-modal": "true", className: ["admin-kit__dialog", className].filter(Boolean).join(" "), role: "dialog", tabIndex: -1, children: [(0, jsx_runtime_1.jsxs)("header", { className: "admin-kit__dialog-header", children: [(0, jsx_runtime_1.jsx)("h2", { id: titleId, children: title }), (0, jsx_runtime_1.jsx)("button", { "aria-label": "Close dialog", className: "admin-kit__dialog-close", disabled: closeDisabled, onClick: onClose, type: "button", children: "\u00D7" })] }), description ? ((0, jsx_runtime_1.jsx)("p", { className: "admin-kit__dialog-description", id: descriptionId, children: description })) : null, (0, jsx_runtime_1.jsx)("div", { className: "admin-kit__dialog-body", children: children }), actions ? (0, jsx_runtime_1.jsx)("footer", { className: "admin-kit__dialog-actions", children: actions }) : null] }) }));
    return mounted ? (0, react_dom_1.createPortal)(surface, document.body) : surface;
}
