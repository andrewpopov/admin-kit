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
export interface AdminMembershipsAdapter<InviteInput = never> {
    scope: AdminMembershipScope;
    roles: readonly AdminMembershipRole[];
    list(): Promise<readonly AdminMembershipSummary[]>;
    invite?: AdminMembershipMutation<InviteInput, AdminMembershipSummary | void>;
    setRole?: AdminMembershipMutation<AdminMembershipRoleChange, AdminMembershipSummary | void>;
    remove?: AdminMembershipMutation<{
        memberId: string;
    }>;
}
/** Validates host vocabulary without imposing an organization/workspace schema. */
export declare function defineAdminMembershipsAdapter<InviteInput = never>(adapter: AdminMembershipsAdapter<InviteInput>): AdminMembershipsAdapter<InviteInput>;
/** Rejects a misleading member model before a host renders an unsafe action. */
export declare function validateAdminMemberships(members: readonly AdminMembershipSummary[], roles: readonly AdminMembershipRole[]): readonly AdminMembershipSummary[];
