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
/**
 * Host applications supply the impact language and server-side semantics;
 * this component only supplies the accessible confirmation interaction.
 * Renders via a portal into `document.body` so ancestor `overflow` or
 * `transform` styles in a host layout cannot clip or mis-layer it.
 */
export declare function AdminConfirmationDialog({ open, title, description, confirmLabel, cancelLabel, onCancel, onConfirm, danger, pending, className, }: AdminConfirmationDialogProps): import("react").JSX.Element | null;
