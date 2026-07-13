import type { AdminPage, AdminPageQuery } from "./contracts";
/** A presentational user shape; applications keep their own domain user type. */
export interface AdminUserSummary {
    id: string;
    label: string;
    secondaryLabel?: string;
    role?: AdminUserValue;
    status?: AdminUserValue;
    badges?: readonly string[];
}
/** A host-owned role or status value that can be shown and selected by the UI. */
export interface AdminUserValue {
    value: string;
    label: string;
    tone?: "neutral" | "success" | "warning" | "danger";
}
export interface AdminUserMutation<Input, Result> {
    execute(input: Input): Promise<Result>;
}
export interface AdminUserRoleChange {
    userId: string;
    role: string;
}
export interface AdminUserStatusChange {
    userId: string;
    status: string;
}
export interface AdminUserActionTarget {
    userId: string;
}
/**
 * Capability-based adapter for a users panel. The host maps its API envelopes,
 * role/status vocabulary, and destructive-flow confirmation into this shape.
 * Missing mutations are intentionally unavailable in the rendered UI.
 */
export interface AdminUsersAdapter<User extends AdminUserSummary = AdminUserSummary, CreateInput = never, InviteInput = never, DeleteInput extends AdminUserActionTarget = AdminUserActionTarget> {
    list(query: AdminPageQuery): Promise<AdminPage<User>>;
    roles?: readonly AdminUserValue[];
    statuses?: readonly AdminUserValue[];
    create?: AdminUserMutation<CreateInput, User>;
    invite?: AdminUserMutation<InviteInput, User>;
    setRole?: AdminUserMutation<AdminUserRoleChange, User>;
    setStatus?: AdminUserMutation<AdminUserStatusChange, User>;
    resetCredentials?: AdminUserMutation<AdminUserActionTarget, void>;
    delete?: AdminUserMutation<DeleteInput, void>;
}
/** Validates declarative options while preserving host-owned mutation implementations. */
export declare function defineAdminUsersAdapter<User extends AdminUserSummary, CreateInput = never, InviteInput = never, DeleteInput extends AdminUserActionTarget = AdminUserActionTarget>(adapter: AdminUsersAdapter<User, CreateInput, InviteInput, DeleteInput>): AdminUsersAdapter<User, CreateInput, InviteInput, DeleteInput>;
