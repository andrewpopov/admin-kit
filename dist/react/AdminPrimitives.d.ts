import type { ButtonHTMLAttributes, ReactNode } from "react";
export interface AdminCardProps {
    title?: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
}
/** A canonical container for product-specific content inside an admin section. */
export declare function AdminCard({ title, description, actions, children, className }: AdminCardProps): import("react").JSX.Element;
export interface AdminFieldProps {
    label: ReactNode;
    hint?: ReactNode;
    error?: ReactNode;
    children: ReactNode;
    className?: string;
}
/** Labels extension controls with the same spacing, hierarchy, and error treatment. */
export declare function AdminField({ label, hint, error, children, className }: AdminFieldProps): import("react").JSX.Element;
export interface AdminStackProps {
    children: ReactNode;
    gap?: "sm" | "md" | "lg";
    className?: string;
}
/** A stable vertical rhythm for custom extension content. */
export declare function AdminStack({ children, gap, className }: AdminStackProps): import("react").JSX.Element;
export interface AdminSwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
    checked: boolean;
    label: ReactNode;
    description?: ReactNode;
    statusLabel?: ReactNode;
}
/** A full-row, labelled switch for consequential binary admin settings. */
export declare function AdminSwitch({ checked, label, description, statusLabel, className, type, ...props }: AdminSwitchProps): import("react").JSX.Element;
