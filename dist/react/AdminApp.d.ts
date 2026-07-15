import type { ReactNode } from 'react';
import { type AdminAppGroupDefinition, type AdminAppSectionDefinition } from '../core';
import { type AdminPortalNavigationItemProps, type AdminPortalProps } from './AdminPortal';
export interface AdminAppReactSection extends AdminAppSectionDefinition {
    render: () => ReactNode;
}
export interface AdminAppReactGroup extends Omit<AdminAppGroupDefinition, 'sections'> {
    sections: readonly AdminAppReactSection[];
}
type WithAdminAppGroups<T> = T extends AdminPortalProps ? Omit<T, 'groups'> & {
    groups: readonly AdminAppReactGroup[];
} : never;
export type AdminAppProps = WithAdminAppGroups<AdminPortalProps>;
/**
 * The canonical Admin Kit application shell. Use this for every host
 * administration area; the lower-level AdminPortal remains available only for
 * product-specific navigation that has no capability registry.
 */
export declare function AdminApp(props: AdminAppProps): import("react").JSX.Element;
export type { AdminPortalNavigationItemProps };
