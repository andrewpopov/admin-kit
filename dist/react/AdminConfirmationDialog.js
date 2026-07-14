"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminConfirmationDialog = AdminConfirmationDialog;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_dom_1 = require("react-dom");
const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
/**
 * Host applications supply the impact language and server-side semantics;
 * this component only supplies the accessible confirmation interaction.
 * Renders via a portal into `document.body` so ancestor `overflow` or
 * `transform` styles in a host layout cannot clip or mis-layer it.
 */
function AdminConfirmationDialog({ open, title, description, confirmLabel, onCancel, onConfirm, danger = false, pending = false, className, }) {
    const cancelRef = (0, react_1.useRef)(null);
    const dialogRef = (0, react_1.useRef)(null);
    const previouslyFocusedRef = (0, react_1.useRef)(null);
    const titleId = (0, react_1.useId)();
    const descriptionId = (0, react_1.useId)();
    const [mounted, setMounted] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => setMounted(true), []);
    (0, react_1.useEffect)(() => {
        if (open) {
            // Capture the trigger only on the closed -> open transition. This effect
            // also re-runs when the portal takes over, and by then the focused
            // element is the dialog's own Cancel button (or body) — recapturing here
            // would restore focus to that instead of whatever opened the dialog.
            previouslyFocusedRef.current ?? (previouslyFocusedRef.current = document.activeElement);
            cancelRef.current?.focus();
        }
        else {
            previouslyFocusedRef.current?.focus();
            previouslyFocusedRef.current = null;
        }
        // Re-run once the portal takes over: the first render (mounted=false)
        // focuses the inline Cancel button, but that subtree is then thrown away
        // when the surface moves into the portal, taking focus with it.
    }, [open, mounted]);
    (0, react_1.useEffect)(() => {
        if (!open)
            return;
        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                // Escape must not bypass `pending`: it dismisses the dialog just
                // like Cancel does, so it must be equally disabled in flight.
                if (pending)
                    return;
                event.preventDefault();
                onCancel();
                return;
            }
            if (event.key !== "Tab")
                return;
            const focusable = dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR);
            if (!focusable || focusable.length === 0) {
                // Both buttons are disabled while pending, so there is nothing to
                // trap focus between. Still prevent default so Tab cannot carry
                // focus out into the page behind the modal, and keep focus pinned
                // to the dialog container itself.
                event.preventDefault();
                dialogRef.current?.focus();
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;
            if (event.shiftKey) {
                if (active === first || !dialogRef.current?.contains(active)) {
                    event.preventDefault();
                    last.focus();
                }
            }
            else {
                if (active === last || !dialogRef.current?.contains(active)) {
                    event.preventDefault();
                    first.focus();
                }
            }
        };
        document.addEventListener("keydown", handleKeyDown, true);
        return () => document.removeEventListener("keydown", handleKeyDown, true);
    }, [open, onCancel, pending]);
    if (!open)
        return null;
    const surface = ((0, jsx_runtime_1.jsx)("div", { className: "admin-kit__dialog-backdrop", role: "presentation", children: (0, jsx_runtime_1.jsxs)("section", { ref: dialogRef, "aria-describedby": descriptionId, "aria-labelledby": titleId, "aria-modal": "true", className: ["admin-kit__dialog", className].filter(Boolean).join(" "), role: "dialog", tabIndex: -1, children: [(0, jsx_runtime_1.jsx)("h2", { id: titleId, children: title }), (0, jsx_runtime_1.jsx)("p", { id: descriptionId, children: description }), (0, jsx_runtime_1.jsxs)("div", { className: "admin-kit__dialog-actions", children: [(0, jsx_runtime_1.jsx)("button", { ref: cancelRef, type: "button", disabled: pending, onClick: onCancel, children: "Cancel" }), (0, jsx_runtime_1.jsx)("button", { className: danger ? "admin-kit__button--danger" : undefined, type: "button", disabled: pending, onClick: onConfirm, children: confirmLabel })] })] }) }));
    // The server renderer cannot render portals, and effects never run there, so
    // `mounted` stays false through SSR and the dialog falls back to inline
    // markup. Hosts drive `open` from client state, so by the time a dialog can
    // actually open the component has long since mounted and portaled.
    if (!mounted)
        return surface;
    return (0, react_dom_1.createPortal)(surface, document.body);
}
