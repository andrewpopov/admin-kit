import type { ReactNode } from "react";
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
/**
 * Accessible form-dialog shell for host-owned create and edit workflows.
 * Hosts own fields, mutation state, and actions; the kit owns the modal
 * interaction, focus management, and responsive surface.
 */
export declare function AdminDialog({ open, title, description, children, actions, onClose, closeDisabled, className, }: AdminDialogProps): import("react").JSX.Element | null;
