export interface AdminConfirmationDialogProps {
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    onCancel: () => void;
    onConfirm: () => void;
    danger?: boolean;
    /** Optional host class for the portaled dialog surface. */
    className?: string;
}
/**
 * Host applications supply the impact language and server-side semantics;
 * this component only supplies the accessible confirmation interaction.
 */
export declare function AdminConfirmationDialog({ open, title, description, confirmLabel, onCancel, onConfirm, danger, className, }: AdminConfirmationDialogProps): import("react").JSX.Element | null;
