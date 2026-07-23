import type { ReactNode } from "react";
import { type AdminAppGroupDefinition, type AdminAppSectionDefinition } from "../core";
import { type AdminPortalNavigationItemProps, type AdminPortalProps } from "./AdminPortal";
import { type AdminThemeName } from "./AdminTheme";
export interface AdminAppReactSection extends AdminAppSectionDefinition {
    render: () => ReactNode;
}
export interface AdminAppReactGroup extends Omit<AdminAppGroupDefinition, "sections"> {
    sections: readonly AdminAppReactSection[];
}
type WithAdminAppGroups<T> = T extends AdminPortalProps ? Omit<T, "groups"> & {
    groups: readonly AdminAppReactGroup[];
} : never;
export interface AdminAppFrame {
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
}
export type AdminAppProps = WithAdminAppGroups<AdminPortalProps> & {
    /** Optional application-level framing; omit it when host chrome already supplies page identity. */
    frame?: AdminAppFrame;
    theme?: AdminThemeName;
};
/**
 * The canonical Admin Kit application shell. Use this for every host
 * administration area; the lower-level AdminPortal remains available only for
 * product-specific navigation that has no capability registry.
 */
export declare function AdminApp({ frame, theme, className, ...portalProps }: AdminAppProps): import("react").JSX.Element;
export type { AdminPortalNavigationItemProps };
