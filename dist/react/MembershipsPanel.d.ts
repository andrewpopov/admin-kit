import { type ReactNode } from "react";
import { type AdminMembershipSummary, type AdminMembershipsAdapter } from "../core";
export interface MembershipsPanelProps<InviteInput = never, Member extends AdminMembershipSummary = AdminMembershipSummary> {
    adapter: AdminMembershipsAdapter<InviteInput, Member>;
    title?: string;
    /** Host-owned account search or invitation form; the package owns its mutation lifecycle. */
    renderAddMember?: (context: {
        submit: (input: InviteInput) => Promise<boolean>;
        reload: () => Promise<void>;
        isPending: boolean;
    }) => ReactNode;
    /** Optional host actions that do not replace shared role and remove controls. */
    renderMemberActions?: (member: Member, context: {
        reload: () => Promise<void>;
        isPending: boolean;
    }) => ReactNode;
    getRemoveDescription?: (member: Member) => string;
    dialogClassName?: string;
    className?: string;
    /** Persist this viewer's column widths under this key. */
    storageKey?: string;
    /** The table fills the viewport and scrolls itself under a pinned header (see `AdminDataTable` `fill`). */
    tableFill?: boolean;
}
/**
 * Scoped membership administration. Hosts own identity discovery, invitation
 * delivery, authorization, inheritance, transport, and audit policy.
 */
export declare function MembershipsPanel<InviteInput = never, Member extends AdminMembershipSummary = AdminMembershipSummary>({ adapter, title, renderAddMember, renderMemberActions, getRemoveDescription, dialogClassName, className, storageKey, tableFill, }: MembershipsPanelProps<InviteInput, Member>): import("react").JSX.Element;
