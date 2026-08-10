import type { AdminPage, AdminPageQuery } from "./contracts";
/** A presentational user shape; applications keep their own domain user type. */
export interface AdminUserSummary {
    id: string;
    label: string;
    secondaryLabel?: string;
    role?: AdminUserValue;
    status?: AdminUserValue;
    /**
     * Per-account mutation policy. Omit a value to allow the corresponding
     * adapter capability; set it to `false` for protected accounts.
     */
    permissions?: AdminUserPermissions;
    badges?: readonly string[];
    details?: readonly AdminUserDetail[];
}
/**
 * Host-owned account-level guards for otherwise available directory actions.
 * They intentionally supplement, rather than replace, adapter capabilities.
 */
export interface AdminUserPermissions {
    canChangeRole?: boolean;
    canChangeStatus?: boolean;
}
/** A safe, presentational account fact such as created date or last login. */
export interface AdminUserDetail {
    label: string;
    value: string;
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
/**
 * Capability-based adapter for a users panel. The host maps its API envelopes
 * and role/status vocabulary into this shape. Missing mutations are
 * intentionally unavailable in the rendered UI. Product-specific create,
 * invite, credential-reset, and delete flows are not adapter members — `UsersPanel`
 * never consumes them, so declaring one would be a no-op. Compose those flows
 * through `renderHeaderActions` and `renderUserActions` instead, where each
 * host keeps its own confirmation, token, and transport semantics.
 */
export interface AdminUsersAdapter<User extends AdminUserSummary = AdminUserSummary> {
    list(query: AdminPageQuery): Promise<AdminPage<User>>;
    roles?: readonly AdminUserValue[];
    statuses?: readonly AdminUserValue[];
    setRole?: AdminUserMutation<AdminUserRoleChange, User>;
    setStatus?: AdminUserMutation<AdminUserStatusChange, User>;
}
/** Validates declarative options while preserving host-owned mutation implementations. */
export declare function defineAdminUsersAdapter<User extends AdminUserSummary>(adapter: AdminUsersAdapter<User>): AdminUsersAdapter<User>;
