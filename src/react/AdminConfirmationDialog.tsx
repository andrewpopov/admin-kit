import { useEffect, useRef } from 'react';

export interface AdminConfirmationDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  danger?: boolean;
}

/**
 * Host applications supply the impact language and server-side semantics;
 * this component only supplies the accessible confirmation interaction.
 */
export function AdminConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
  danger = false,
}: AdminConfirmationDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="admin-kit__dialog-backdrop" role="presentation">
      <section aria-describedby="admin-kit-confirmation-description" aria-labelledby="admin-kit-confirmation-title" aria-modal="true" className="admin-kit__dialog" role="dialog">
        <h2 id="admin-kit-confirmation-title">{title}</h2>
        <p id="admin-kit-confirmation-description">{description}</p>
        <div className="admin-kit__dialog-actions">
          <button ref={cancelRef} type="button" onClick={onCancel}>Cancel</button>
          <button className={danger ? 'admin-kit__button--danger' : undefined} type="button" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}
