import type { ButtonHTMLAttributes } from "react";
export type AdminActionTone = "neutral" | "primary" | "danger";
export interface AdminActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    /** Visual weight for an action rendered in a host-owned toolbar or panel. */
    tone?: AdminActionTone;
}
/**
 * Shared action skin for host-rendered controls. Hosts still own labels,
 * disabled state, and server-authorized behavior.
 */
export declare function AdminActionButton({ className, tone, type, ...props }: AdminActionButtonProps): import("react").JSX.Element;
