import type { ReactNode } from 'react';
import type { AdminSectionDefinition, AdminSectionId } from '../core/contracts';
export interface AdminReactSection extends AdminSectionDefinition {
    render: () => ReactNode;
}
export interface AdminConsoleProps {
    /** The host owns this state so it can map sections to any router or URL shape. */
    activeSection: AdminSectionId;
    sections: readonly AdminReactSection[];
    onSectionChange: (sectionId: AdminSectionId) => void;
    ariaLabel?: string;
    className?: string;
}
/**
 * A controlled admin shell. It intentionally has no router, data client, or
 * authorization dependency: the host determines navigation, supplies panels,
 * and enforces every action on the server.
 */
/** @deprecated Use AdminApp with grouped sections and a capability registry. */
export declare function AdminConsole({ activeSection, sections, onSectionChange, ariaLabel, className, }: AdminConsoleProps): import("react").JSX.Element;
