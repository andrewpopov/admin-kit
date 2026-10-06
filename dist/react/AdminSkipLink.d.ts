import { type ReactNode } from "react";
/** Shares one stable id between a skip link and the content region it targets. */
export declare function AdminContentTargetProvider({ children }: {
    children: ReactNode;
}): import("react").JSX.Element;
export declare function useAdminContentTargetId(): string | undefined;
/**
 * First focusable element of an app: hidden until keyboard focus, then moves
 * focus into the content region. It focuses programmatically instead of
 * following the hash so hash-based host routers never see a URL change.
 */
export declare function AdminSkipLink(): import("react").JSX.Element | null;
