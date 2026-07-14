import type { MouseEventHandler, ReactNode } from 'react';
import type { AdminPortalSectionDefinition, AdminSectionGroupDefinition, AdminSectionId } from '../core/contracts';
export interface AdminPortalReactSection extends AdminPortalSectionDefinition {
    render: () => ReactNode;
}
export interface AdminPortalReactGroup extends Omit<AdminSectionGroupDefinition, 'sections'> {
    sections: readonly AdminPortalReactSection[];
}
export interface AdminPortalNavigationItemProps {
    section: AdminPortalReactSection;
    active: boolean;
    className: string;
    ariaCurrent?: 'page';
    ariaDisabled?: true;
    tabIndex?: -1;
    onClick: MouseEventHandler<HTMLElement>;
}
interface AdminPortalBaseProps {
    /** The host derives this value from its router or other navigation state. */
    activeSection: AdminSectionId;
    groups: readonly AdminPortalReactGroup[];
    ariaLabel?: string;
    className?: string;
    emptyState?: ReactNode;
    inactiveSectionState?: (sectionId: AdminSectionId) => ReactNode;
}
export type AdminPortalProps = AdminPortalBaseProps & ({
    /** Required when the portal renders its default controlled buttons. */
    onSectionChange: (sectionId: AdminSectionId) => void;
    renderNavigationItem?: (props: AdminPortalNavigationItemProps) => ReactNode;
} | {
    /** Render a Next.js Link, React Router NavLink, or another host-owned link. */
    renderNavigationItem: (props: AdminPortalNavigationItemProps) => ReactNode;
    /** Optional notification when the custom router link is selected. */
    onSectionChange?: (sectionId: AdminSectionId) => void;
});
/**
 * A grouped shell for routed administration areas. The host owns URLs,
 * navigation, and authorization; the portal owns grouping, selection,
 * responsive layout, disabled behavior, and accessible page semantics.
 */
export declare function AdminPortal({ activeSection, groups, onSectionChange, renderNavigationItem, ariaLabel, className, emptyState, inactiveSectionState, }: AdminPortalProps): import("react").JSX.Element;
export {};
