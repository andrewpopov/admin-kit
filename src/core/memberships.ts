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
  remove?: AdminMembershipMutation<{ memberId: string }>;
}

function requireText(value: string, description: string): void {
  if (!value.trim()) throw new Error(`${description} must not be empty.`);
}

/** Validates host vocabulary without imposing an organization/workspace schema. */
export function defineAdminMembershipsAdapter<InviteInput = never>(
  adapter: AdminMembershipsAdapter<InviteInput>,
): AdminMembershipsAdapter<InviteInput> {
  requireText(adapter.scope.id, "Membership scope id");
  requireText(adapter.scope.label, "Membership scope label");
  requireText(adapter.scope.kind, "Membership scope kind");
  if (adapter.roles.length === 0)
    throw new Error("Membership roles must include at least one value.");

  const roles = new Set<string>();
  for (const role of adapter.roles) {
    requireText(role.value, "Membership role value");
    requireText(role.label, `Membership role ${role.value} label`);
    if (roles.has(role.value))
      throw new Error(`Duplicate membership role: ${role.value}.`);
    roles.add(role.value);
  }

  return Object.freeze({
    ...adapter,
    scope: Object.freeze({ ...adapter.scope }),
    roles: Object.freeze(adapter.roles.map((role) => Object.freeze({ ...role }))),
  });
}

/** Rejects a misleading member model before a host renders an unsafe action. */
export function validateAdminMemberships(
  members: readonly AdminMembershipSummary[],
  roles: readonly AdminMembershipRole[],
): readonly AdminMembershipSummary[] {
  const allowedRoles = new Set(roles.map((role) => role.value));
  const ids = new Set<string>();
  return Object.freeze(
    members.map((member) => {
      requireText(member.memberId, "Membership member id");
      requireText(member.label, "Membership member label");
      if (!allowedRoles.has(member.role))
        throw new Error(`Membership ${member.memberId} has an undeclared role.`);
      if (member.source === "inherited" && member.mutable)
        throw new Error(`Inherited membership ${member.memberId} cannot be mutable.`);
      if (ids.has(member.memberId))
        throw new Error(`Duplicate membership member: ${member.memberId}.`);
      ids.add(member.memberId);
      return Object.freeze({ ...member });
    }),
  );
}
