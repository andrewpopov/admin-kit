import type { ReactNode } from 'react';
export type AdminPanelState = {
    kind: 'ready';
    children: ReactNode;
} | {
    kind: 'loading';
    label?: string;
} | {
    kind: 'empty';
    title: string;
    detail?: string;
} | {
    kind: 'error';
    title?: string;
    detail: string;
    onRetry?: () => void;
};
/** Accessible, framework-style-neutral state surface for adapter-backed panels. */
export declare function AdminPanelStateView({ state, className }: {
    state: AdminPanelState;
    className?: string;
}): import("react").JSX.Element;
