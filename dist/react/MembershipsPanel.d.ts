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
}
/**
 * Scoped membership administration. Hosts own identity discovery, invitation
 * delivery, authorization, inheritance, transport, and audit policy.
 */
export declare function MembershipsPanel<InviteInput = never, Member extends AdminMembershipSummary = AdminMembershipSummary>({ adapter, title, renderAddMember, renderMemberActions, getRemoveDescription, dialogClassName, className, }: MembershipsPanelProps<InviteInput, Member>): import("react").JSX.Element;
