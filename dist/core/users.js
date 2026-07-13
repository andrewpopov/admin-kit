"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineAdminUsersAdapter = defineAdminUsersAdapter;
function validateValues(name, values) {
    if (!values)
        return;
    const seen = new Set();
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
function defineAdminUsersAdapter(adapter) {
    validateValues("Role", adapter.roles);
    validateValues("Status", adapter.statuses);
    return Object.freeze({
        ...adapter,
        roles: adapter.roles
            ? Object.freeze(adapter.roles.map((value) => Object.freeze({ ...value })))
            : undefined,
        statuses: adapter.statuses
            ? Object.freeze(adapter.statuses.map((value) => Object.freeze({ ...value })))
            : undefined,
    });
}
