"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defineAdminSessionsAdapter = defineAdminSessionsAdapter;
exports.validateAdminSessions = validateAdminSessions;
function requireText(value, description) {
    if (!value.trim())
        throw new Error(`${description} must not be empty.`);
}
function defineAdminSessionsAdapter(adapter) {
    requireText(adapter.scope.id, "Session scope id");
    requireText(adapter.scope.label, "Session scope label");
    requireText(adapter.scope.kind, "Session scope kind");
    if (adapter.bulkRevoke) {
        requireText(adapter.bulkRevoke.label, "Bulk session action label");
        requireText(adapter.bulkRevoke.confirmTitle, "Bulk session confirmation title");
        requireText(adapter.bulkRevoke.confirmDescription, "Bulk session confirmation description");
    }
    return Object.freeze({ ...adapter, scope: Object.freeze({ ...adapter.scope }) });
}
function validateAdminSessions(sessions) {
    const ids = new Set();
    return Object.freeze(sessions.map((session) => {
        requireText(session.id, "Session id");
        requireText(session.label, `Session ${session.id} label`);
        requireText(session.createdAt, `Session ${session.id} created timestamp`);
        if (ids.has(session.id))
            throw new Error(`Duplicate active session: ${session.id}.`);
        ids.add(session.id);
        const details = session.details?.map((detail) => {
            requireText(detail.label, `Session ${session.id} detail label`);
            requireText(detail.value, `Session ${session.id} detail ${detail.label}`);
            return Object.freeze({ ...detail });
        });
        return Object.freeze({
            ...session,
            details: details ? Object.freeze(details) : undefined,
            permissions: session.permissions ? Object.freeze({ ...session.permissions }) : undefined,
        });
    }));
}
