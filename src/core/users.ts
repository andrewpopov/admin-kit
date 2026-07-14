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

export interface AdminUserActionTarget {
  userId: string;
}

/**
 * Capability-based adapter for a users panel. The host maps its API envelopes,
 * role/status vocabulary, and destructive-flow confirmation into this shape.
 * Missing mutations are intentionally unavailable in the rendered UI.
 */
export interface AdminUsersAdapter<
  User extends AdminUserSummary = AdminUserSummary,
  CreateInput = never,
  InviteInput = never,
  DeleteInput extends AdminUserActionTarget = AdminUserActionTarget,
> {
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

function validateValues(
  name: string,
  values: readonly AdminUserValue[] | undefined,
): void {
  if (!values) return;

  const seen = new Set<string>();
  for (const value of values) {
    if (!value.value.trim())
      throw new Error(`${name} values must not be empty.`);
    if (!value.label.trim())
      throw new Error(`${name} value ${value.value} needs a label.`);
    if (seen.has(value.value))
      throw new Error(`Duplicate ${name} value: ${value.value}.`);
    seen.add(value.value);
  }
}

/** Validates declarative options while preserving host-owned mutation implementations. */
export function defineAdminUsersAdapter<
  User extends AdminUserSummary,
  CreateInput = never,
  InviteInput = never,
  DeleteInput extends AdminUserActionTarget = AdminUserActionTarget,
>(
  adapter: AdminUsersAdapter<User, CreateInput, InviteInput, DeleteInput>,
): AdminUsersAdapter<User, CreateInput, InviteInput, DeleteInput> {
  validateValues("Role", adapter.roles);
  validateValues("Status", adapter.statuses);

  return Object.freeze({
    ...adapter,
    roles: adapter.roles
      ? Object.freeze(adapter.roles.map((value) => Object.freeze({ ...value })))
      : undefined,
    statuses: adapter.statuses
      ? Object.freeze(
          adapter.statuses.map((value) => Object.freeze({ ...value })),
        )
      : undefined,
  });
}
