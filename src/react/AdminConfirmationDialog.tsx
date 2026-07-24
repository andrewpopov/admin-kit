"use client";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAdminLabels } from "./AdminLabels";

export interface AdminConfirmationDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  /** Overrides the shared Admin Kit "Cancel" label for this dialog. */
  cancelLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
  danger?: boolean;
  /** Disables Confirm and Cancel while the confirmed action is in flight. */
  pending?: boolean;
  /** Optional host class for the portaled dialog surface. */
  className?: string;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Host applications supply the impact language and server-side semantics;
 * this component only supplies the accessible confirmation interaction.
 * Renders via a portal into `document.body` so ancestor `overflow` or
 * `transform` styles in a host layout cannot clip or mis-layer it.
 */
export function AdminConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onCancel,
  onConfirm,
  danger = false,
  pending = false,
  className,
}: AdminConfirmationDialogProps) {
  const labels = useAdminLabels();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      // Capture the trigger only on the closed -> open transition. This effect
      // also re-runs when the portal takes over, and by then the focused
      // element is the dialog's own Cancel button (or body) — recapturing here
      // would restore focus to that instead of whatever opened the dialog.
      previouslyFocusedRef.current ??= document.activeElement as HTMLElement | null;
      cancelRef.current?.focus();
    } else {
      previouslyFocusedRef.current?.focus();
      previouslyFocusedRef.current = null;
    }
    // Re-run once the portal takes over: the first render (mounted=false)
    // focuses the inline Cancel button, but that subtree is then thrown away
    // when the surface moves into the portal, taking focus with it.
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // Escape must not bypass `pending`: it dismisses the dialog just
        // like Cancel does, so it must be equally disabled in flight.
        if (pending) return;
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (!focusable || focusable.length === 0) {
        // Both buttons are disabled while pending, so there is nothing to
        // trap focus between. Still prevent default so Tab cannot carry
        // focus out into the page behind the modal, and keep focus pinned
        // to the dialog container itself.
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !dialogRef.current?.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !dialogRef.current?.contains(active)) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [open, onCancel, pending]);

  if (!open) return null;

  const surface = (
    <div className="admin-kit__dialog-backdrop" role="presentation">
      <section
        ref={dialogRef}
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className={["admin-kit__dialog", className].filter(Boolean).join(" ")}
        role="dialog"
        tabIndex={-1}
      >
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId}>{description}</p>
        <div className="admin-kit__dialog-actions">
          <button ref={cancelRef} type="button" disabled={pending} onClick={onCancel}>
            {cancelLabel ?? labels.cancel}
          </button>
          <button
            className={danger ? "admin-kit__button--danger" : undefined}
            type="button"
            disabled={pending}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );

  // The server renderer cannot render portals, and effects never run there, so
  // `mounted` stays false through SSR and the dialog falls back to inline
  // markup. Hosts drive `open` from client state, so by the time a dialog can
  // actually open the component has long since mounted and portaled.
  if (!mounted) return surface;

  return createPortal(surface, document.body);
}
