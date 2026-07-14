"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminConfirmationDialog = AdminConfirmationDialog;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
/**
 * Host applications supply the impact language and server-side semantics;
 * this component only supplies the accessible confirmation interaction.
 */
function AdminConfirmationDialog({ open, title, description, confirmLabel, onCancel, onConfirm, danger = false, className, }) {
    const cancelRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (open)
            cancelRef.current?.focus();
    }, [open]);
    if (!open)
        return null;
    return ((0, jsx_runtime_1.jsx)("div", { className: "admin-kit__dialog-backdrop", role: "presentation", children: (0, jsx_runtime_1.jsxs)("section", { "aria-describedby": "admin-kit-confirmation-description", "aria-labelledby": "admin-kit-confirmation-title", "aria-modal": "true", className: ['admin-kit__dialog', className].filter(Boolean).join(' '), role: "dialog", children: [(0, jsx_runtime_1.jsx)("h2", { id: "admin-kit-confirmation-title", children: title }), (0, jsx_runtime_1.jsx)("p", { id: "admin-kit-confirmation-description", children: description }), (0, jsx_runtime_1.jsxs)("div", { className: "admin-kit__dialog-actions", children: [(0, jsx_runtime_1.jsx)("button", { ref: cancelRef, type: "button", onClick: onCancel, children: "Cancel" }), (0, jsx_runtime_1.jsx)("button", { className: danger ? 'admin-kit__button--danger' : undefined, type: "button", onClick: onConfirm, children: confirmLabel })] })] }) }));
}
