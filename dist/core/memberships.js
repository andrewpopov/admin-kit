"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineAdminMembershipsAdapter = defineAdminMembershipsAdapter;
exports.validateAdminMemberships = validateAdminMemberships;
function requireText(value, description) {
    if (!value.trim())
        throw new Error(`${description} must not be empty.`);
}
/** Validates host vocabulary without imposing an organization/workspace schema. */
function defineAdminMembershipsAdapter(adapter) {
    requireText(adapter.scope.id, "Membership scope id");
    requireText(adapter.scope.label, "Membership scope label");
    requireText(adapter.scope.kind, "Membership scope kind");
    if (adapter.roles.length === 0)
        throw new Error("Membership roles must include at least one value.");
    const roles = new Set();
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
function validateAdminMemberships(members, roles) {
    const allowedRoles = new Set(roles.map((role) => role.value));
    const ids = new Set();
    return Object.freeze(members.map((member) => {
        requireText(member.memberId, "Membership member id");
        requireText(member.label, "Membership member label");
        if (!allowedRoles.has(member.role))
            throw new Error(`Membership ${member.memberId} has an undeclared role.`);
        if (member.source === "inherited" && member.mutable)
            throw new Error(`Inherited membership ${member.memberId} cannot be mutable.`);
        if (member.source === "inherited" &&
            (member.permissions?.canChangeRole || member.permissions?.canRemove))
            throw new Error(`Inherited membership ${member.memberId} cannot expose mutations.`);
        if (ids.has(member.memberId))
            throw new Error(`Duplicate membership member: ${member.memberId}.`);
        ids.add(member.memberId);
        return Object.freeze({
            ...member,
            permissions: member.permissions ? Object.freeze({ ...member.permissions }) : undefined,
        });
    }));
}
