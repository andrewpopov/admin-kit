import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface AdminDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  description?: ReactNode;
  onClose: () => void;
  /** Prevents all dismissal paths while a host mutation is in flight. */
  closeDisabled?: boolean;
  /** Optional host class for the portaled dialog surface. */
  className?: string;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible form-dialog shell for host-owned create and edit workflows.
 * Hosts own fields, mutation state, and actions; the kit owns the modal
 * interaction, focus management, and responsive surface.
 */
export function AdminDialog({
  open,
  title,
  description,
  children,
  actions,
  onClose,
  closeDisabled = false,
  className,
}: AdminDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      previouslyFocusedRef.current ??= document.activeElement as HTMLElement | null;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      const initialFocusTarget = Array.from(focusable ?? []).find(
        (element) => !element.classList.contains("admin-kit__dialog-close"),
      ) ?? focusable?.[0];
      initialFocusTarget?.focus();
    } else {
      previouslyFocusedRef.current?.focus();
      previouslyFocusedRef.current = null;
    }
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (closeDisabled) return;
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (!focusable || focusable.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;
      if (event.shiftKey ? active === first || !dialogRef.current?.contains(active) : active === last) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [open, onClose, closeDisabled]);

  if (!open) return null;

  const surface = (
    <div
      className="admin-kit__dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (!closeDisabled && event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={["admin-kit__dialog", className].filter(Boolean).join(" ")}
        role="dialog"
        tabIndex={-1}
      >
        <header className="admin-kit__dialog-header">
          <h2 id={titleId}>{title}</h2>
          <button aria-label="Close dialog" className="admin-kit__dialog-close" disabled={closeDisabled} onClick={onClose} type="button">×</button>
        </header>
        {description ? <p className="admin-kit__dialog-description" id={descriptionId}>{description}</p> : null}
        <div className="admin-kit__dialog-body">{children}</div>
        {actions ? <footer className="admin-kit__dialog-actions">{actions}</footer> : null}
      </section>
    </div>
  );

  return mounted ? createPortal(surface, document.body) : surface;
}
