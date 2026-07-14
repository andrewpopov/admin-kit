/** A role that belongs to a host-defined scope, not a global account. */
export interface AdminMembershipRole {
    value: string;
    label: string;
    tone?: "neutral" | "success" | "warning" | "danger";
}
/** A workspace, organization, project, or other host-owned membership scope. */
export interface AdminMembershipScope {
    id: string;
    label: string;
    kind: string;
}
/** Presentation data for one member in a host-owned scope. */
export interface AdminMembershipSummary {
    memberId: string;
    label: string;
    secondaryLabel?: string;
    role: string;
    /** Explicit membership can be changed here; inherited membership is informational. */
    source: "explicit" | "inherited";
    mutable: boolean;
    /** Host-computed presentation permissions for the current administrator. */
    permissions?: {
        canChangeRole?: boolean;
        canRemove?: boolean;
    };
}
export interface AdminMembershipRoleChange {
    memberId: string;
    role: string;
}
export interface AdminMembershipMutation<Input, Result = void> {
    execute(input: Input): Promise<Result>;
}
/**
 * Transport-neutral scoped-membership contract. Hosts retain invitation
 * delivery, authorization, inheritance rules, audits, and deletion policy.
 */
export interface AdminMembershipsAdapter<InviteInput = never, Member extends AdminMembershipSummary = AdminMembershipSummary> {
    scope: AdminMembershipScope;
    roles: readonly AdminMembershipRole[];
    list(): Promise<readonly Member[]>;
    invite?: AdminMembershipMutation<InviteInput, Member | void>;
    setRole?: AdminMembershipMutation<AdminMembershipRoleChange, Member | void>;
    remove?: AdminMembershipMutation<{
        memberId: string;
    }>;
}
/** Validates host vocabulary without imposing an organization/workspace schema. */
export declare function defineAdminMembershipsAdapter<InviteInput = never, Member extends AdminMembershipSummary = AdminMembershipSummary>(adapter: AdminMembershipsAdapter<InviteInput, Member>): AdminMembershipsAdapter<InviteInput, Member>;
/** Rejects a misleading member model before a host renders an unsafe action. */
export declare function validateAdminMemberships<Member extends AdminMembershipSummary>(members: readonly Member[], roles: readonly AdminMembershipRole[]): readonly Member[];
