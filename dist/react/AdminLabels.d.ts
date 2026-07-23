import { type ReactNode } from "react";
export interface AdminLabels {
    loading: string;
    errorTitle: string;
    retry: string;
    cancel: string;
    previousPage: string;
    nextPage: string;
    pageStatus: (page: number, pageCount: number) => string;
}
export declare const defaultAdminLabels: AdminLabels;
/**
 * Localizes shared Admin Kit chrome strings (loading/error/pagination copy) for
 * every descendant. Layers over the labels already in context — so nested
 * providers (e.g. a host wrapping `AdminApp`, which installs its own provider)
 * compose instead of resetting unspecified strings to English — and ignores
 * `undefined` overrides so an explicit `{ cancel: undefined }` keeps the
 * inherited value rather than blanking it.
 */
export declare function AdminLabelsProvider({ labels, children, }: {
    labels?: Partial<AdminLabels>;
    children: ReactNode;
}): import("react").JSX.Element;
export declare function useAdminLabels(): AdminLabels;
